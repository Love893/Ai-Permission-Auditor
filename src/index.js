import Resolver from '@forge/resolver';
import api, { route , storage } from '@forge/api';

const resolver = new Resolver();

/**
 * =========================
 * Config
 * =========================
 */
const CONFIG = {
  USERS_CHECK_BATCH_SIZE: 10,
  PROJECTS_CONCURRENCY: 4,
  ROLES_CONCURRENCY: 6,
  MEMBERS_CONCURRENCY: 10,
  PAGE_SIZE_USERS: 100,
  PAGE_SIZE_PROJECTS: 50,
};

/**
 * Caches
 */
const groupCache = new Map();     // accountId -> groups
const userIndex = new Map();      // accountId -> user

/**
 * =========================
 * Top-level resolver
 * =========================
 */
// ✅ First resolver: fetch base data
resolver.define('initAudit', async ({ payload }) => {
  try {
    const [allUsers, allProjects, groupedPermissionKeys] = await Promise.all([
      getAllJiraUsers(),
      getAllJiraProjects(),
      getAllPermissions(),
    ]);

    return {
      success: true,
      allUsers,
      allProjects,
      groupedPermissionKeys,
    };
  } catch (error) {
    console.error('initAudit failed:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// ✅ Second resolver: consume inputs, do calculations, push to DB
resolver.define('processAudit', async ({ payload }) => {
  const { cloudId, allUsers, allProjects, groupedPermissionKeys } = payload || {};

  try {
    if (!allProjects || allProjects.length === 0) {
      throw new Error("No project provided to processAudit");
    }

    // index users (if not already cached)
    for (const u of allUsers) userIndex.set(u.accountId, u);

    // compute global permissions once
    const globalPermissions = await checkGlobalPermissionsForAll(allUsers, groupedPermissionKeys);

    // ✅ take only the first project (frontend calls this per project)
    const project = allProjects[0];
    const out = [];

    const settled = await Promise.allSettled([
      buildProjectPermissionData(project, allUsers),
    ]);

    out.push(
      ...settled
        .filter((s) => s.status === "fulfilled" && s.value)
        .map((s) => s.value)
    );

    const [projData] = out;

    // 🔹 Push to SQS
    try {
      const sqsPayload = {
        event: "permissionaudit",
        orgId: cloudId,
        data: out,
        globalPermissions,
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(sqsPayload);
      const payloadSizeKB = (payloadString.length / 1024).toFixed(2);

      const resp = await fetch("https://forgeapps.clovity.com/v0/api/sqs/send", {
        method: "POST",
        headers: {
          "x-api-key": process.env.APP_RUNNER_API_KEY,
          "Content-Type": "application/json",
        },
        body: payloadString,
      });

      if (resp.ok) {
        console.log(
          `📤 SQS push success → Project: ${projData?.projectName || project.key}, 📏 Size: ${payloadSizeKB} KB`
        );
      } else {
        console.error(
          `❌ SQS push failed for Project: ${projData?.projectName || project.key}, Status: ${resp.status} - ${resp.statusText}`
        );
      }
    } catch (e) {
      console.error("❌ Failed to send to SQS:", e);
    }

    return {
      success: true,
      event: "PermissionAuditor",
      orgId: cloudId,
      project: projData || project, // return project-level result
      globalPermissions,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("processAudit failed:", error);
    return { success: false, error: error.message || String(error) };
  }
});


resolver.define('setLastScannedAt', async ({ payload }) => {
  const { orgId, ts } = payload || {};
  if (!orgId || typeof ts !== 'number') {
    return { success: false, error: 'orgId and numeric ts required' };
  }
  const key = `lastScannedAt:${orgId}`;
  await storage.set(key, ts);
  return { success: true };
});

resolver.define('getLastScannedAt', async ({ payload }) => {
  const { orgId } = payload || {};
  if (!orgId) return { lastScannedAt: null };
  const key = `lastScannedAt:${orgId}`;
  const val = await storage.get(key); // number (ms) or undefined
  return { lastScannedAt: val ?? null };
});


resolver.define('queryPermissionAuditor', async ({ payload }) => {
  const { query, event = 'permissionaudit', orgId } = payload || {};
  
  const resp = await fetch('https://forgeapps.clovity.com/v0/api/query', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.APP_RUNNER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, event, orgId })
  });
console.log("resp*********",resp)
  if (!resp.ok) {
    const text = await resp.text();
    return { success: false, error: `Upstream error ${resp.status}: ${text?.slice(0, 400) || 'Unknown'}` };
  }
  const data = await resp.json();
  return { success: true, data };
});


/**
 * =========================
 * Fetchers
 * =========================
 */

async function getAllJiraUsers() {
  const users = [];
  let startAt = 0;

  while (true) {
    const res = await api.asApp().requestJira(
      route`/rest/api/3/users/search?startAt=${startAt}&maxResults=${CONFIG.PAGE_SIZE_USERS}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      console.error(`Error fetching users: ${res.status} - ${await res.text()}`);
      break;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    users.push(
      ...data
        .filter((u) => u.accountType === 'atlassian' && u.accountId && u.displayName)
        .map((u) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress:u.emailAddress,
          active: u.active ?? true,
        }))
    );

    startAt += CONFIG.PAGE_SIZE_USERS;
  }

  return users;
}

async function getAllJiraProjects() {
  const projects = [];
  let startAt = 0;

  while (true) {
    const res = await api.asApp().requestJira(
      route`/rest/api/3/project/search?startAt=${startAt}&maxResults=${CONFIG.PAGE_SIZE_PROJECTS}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      console.error(`Error fetching projects: ${res.status} - ${await res.text()}`);
      break;
    }

    const data = await res.json();
    const values = data?.values || [];
    if (values.length === 0) break;

    projects.push(
      ...values.map((p) => ({
        key: p.key,
        id: p.id,
        displayName: p.name,
      }))
    );

    startAt += CONFIG.PAGE_SIZE_PROJECTS;
  }

  return projects;
}

async function getAllPermissions() {
  const res = await api.asApp().requestJira(route`/rest/api/3/permissions`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch permissions: ${res.status} - ${await res.text()}`);
  }

  const data = await res.json();
  const all = Object.values(data?.permissions || {});

  return {
    global: all.filter((p) => p.type === 'GLOBAL').map((p) => p.key),
    project: all.filter((p) => p.type === 'PROJECT').map((p) => p.key),
  };
}

/**
 * =========================
 * Global permission checks
 * =========================
 */
async function checkGlobalPermissionsForAll(users, groupedPermissionKeys) {
  const results = [];
  const batchSize = CONFIG.USERS_CHECK_BATCH_SIZE;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const settled = await Promise.allSettled(
      batch.map(async (user) => {
        const res = await api.asApp().requestJira(route`/rest/api/3/permissions/check`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: user.accountId,
            globalPermissions: groupedPermissionKeys.global,
          }),
        });

        if (!res.ok) {
          console.error(`Global perm check failed for ${user.accountId}: ${res.status}`);
          return null;
        }

        const json = await res.json();
        return {
          user: { accountId: user.accountId, displayName: user.displayName },
          permissions: json?.globalPermissions || [],
        };
      })
    );

    results.push(...settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value));
  }

  return results;
}

/**
 * =========================
 * Projects + Roles
 * =========================
 */
async function getAllProjectPermissionSchemes(projects, allUsers) {
  const out = [];

  for (let i = 0; i < projects.length; i += CONFIG.PROJECTS_CONCURRENCY) {
    const slice = projects.slice(i, i + CONFIG.PROJECTS_CONCURRENCY);

    const settled = await Promise.allSettled(
      slice.map((p) => buildProjectPermissionData(p, allUsers))
    );

    out.push(...settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value));
  }

  return out;
}

async function buildProjectPermissionData(project, allUsers) {
  const [permissionScheme, roleDetails] = await Promise.all([
    getProjectPermissionScheme(project.id),
    getRoleIdScheme(project.id),
  ]);

  const roles = await buildRolesForProject(project.id, roleDetails || [], allUsers);

  return {
    projectId: project.id,
    projectName: project.displayName,
    permissionScheme: {
      schemeId: permissionScheme?.id || null,
      schemeName: permissionScheme?.name || null,
      roles,
    },
  };
}

async function buildRolesForProject(projectId, roleDetails, allUsers) {
  if (!Array.isArray(roleDetails) || roleDetails.length === 0) return [];

  const rolesOut = [];
  for (let i = 0; i < roleDetails.length; i += CONFIG.ROLES_CONCURRENCY) {
    const slice = roleDetails.slice(i, i + CONFIG.ROLES_CONCURRENCY);

    const settled = await Promise.allSettled(
      slice.map(async (role) => {
        const members = await getRoleUsersScheme(projectId, role.id);
        const actors = members?.actors || [];

        const usersWithGroups = [];
        for (let j = 0; j < actors.length; j += CONFIG.MEMBERS_CONCURRENCY) {
          const memberSlice = actors.slice(j, j + CONFIG.MEMBERS_CONCURRENCY);

          const results = await Promise.allSettled(
            memberSlice.map((actor) => expandActorToUser(actor, allUsers))
          );

          usersWithGroups.push(
            ...results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
          );
        }

        return { role: role.name, users: usersWithGroups };
      })
    );

    rolesOut.push(...settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value));
  }

  return rolesOut;
}

/**
 * =========================
 * Actor expansion (safe awaits)
 * =========================
 */
async function expandActorToUser(actor, allUsers) {
  const accountId = actor?.actorUser?.accountId;
  // console.log("ACC ID***",accountId)
  if (!accountId) return null;

  let displayName = actor?.actorUser?.displayName || 'NAME NOT FOUND';
  let email = actor?.actorUser?.emailAddress || 'EMAIL NOT FOUND';

  const matched = allUsers.find((u) => u.accountId === accountId);
  // console.log("matched********",matched)
  if (matched) {
    displayName = matched.displayName || displayName;
    email = matched.emailAddress || email
  }

  const groupsResp = await getGroupsOnAccId(accountId);
  const groups = Array.isArray(groupsResp) ? groupsResp.map((g) => g.name).filter(Boolean) : [];

  return {
    accountId,
    displayName,
    lastLogin: 'Null',
    riskLevel: 'medium',
    email,
    groups,
    active: matched?.active ?? actor?.actorUser?.active ?? true,
  };
}

/**
 * =========================
 * Low-level Jira API
 * =========================
 */
async function getProjectPermissionScheme(projectKeyOrId) {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/permissionscheme`,
    { headers: { Accept: 'application/json' } }
  );
  return res.ok ? res.json() : null;
}

async function getRoleIdScheme(projectKeyOrId) {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/roledetails`,
    { headers: { Accept: 'application/json' } }
  );
  return res.ok ? res.json() : [];
}

async function getRoleUsersScheme(projectKeyOrId, roleId) {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/role/${roleId}`,
    { headers: { Accept: 'application/json' } }
  );
  return res.ok ? res.json() : null;
}

/**
 * =========================
 * Group cache
 * =========================
 */
async function getGroupsOnAccId(accountId) {
  if (groupCache.has(accountId)) return groupCache.get(accountId);

  const res = await api.asApp().requestJira(
    route`/rest/api/3/user/groups?accountId=${accountId}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!res.ok) {
    console.error(`Group fetch failed for account ${accountId}: ${res.status}`);
    groupCache.set(accountId, []);
    return [];
  }

  const data = await res.json();
  groupCache.set(accountId, data || []);
  return data || [];
}


resolver.define('sendHardcodedProjectsToSQS', async ({ payload }) => {
  const { result } = payload || {};
  

  console.log("fJSON***", JSON.stringify(result))
  try {
    const resp = await fetch('https://forgeapps.clovity.com/v0/api/sqs/send', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.APP_RUNNER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    });

    console.log("response*****",resp);
    return JSON.stringify(result)

  } catch (e) {
 return { success: false, error: `Resolver error: ${e.message}` };
  }
});


export const handler = resolver.getDefinitions();
