import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';

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
const groupCache = new Map(); // accountId -> groups
const userIndex = new Map(); // accountId -> user

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
  const { cloudId, allUsers, allProjects, groupedPermissionKeys,lastLoginResults } = payload || {};
  // console.log("lastlogin***",JSON.stringify(lastLoginResults))

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
      buildProjectPermissionData(project, allUsers, globalPermissions ,lastLoginResults ),
    ]);

    out.push(...settled.filter((s) => s.status === "fulfilled" && s.value).map((s) => s.value));

    const [projData] = out;

    // 🔹 Push to SQS
    try {
      const sqsPayload = {
        event: "permissionaudit",
        orgId: cloudId,
        data: out,
        // globalPermissions,
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(sqsPayload);
      const payloadSizeKB = (payloadString.length / 1024).toFixed(2);

      // const resp = await fetch("https://forgeapps.clovity.com/v0/api/sqs/send", {
      //   method: "POST",
      //   headers: {
      //    "x-api-key": process.env.APP_RUNNER_API_KEY,
      //    "Content-Type": "application/json",
      //   },
      //   body: payloadString,
      // });

      // console.log("Data", payloadString)

      // if (resp.ok) {
      //   console.log(
      //     `📤 SQS push success → Project: ${projData?.projectName || project.key}, 📏 Size: ${payloadSizeKB} KB`
      //   );
      // } else {
      //   console.error(
      //     `❌ SQS push failed for Project: ${projData?.projectName || project.key}, Status: ${resp.status} - ${resp.statusText}`
      //   );
      // }
    } catch (e) {
      console.error("❌ Failed to send to SQS:", e);
    }

    return {
      success: true,
      event: "permissionaudit",
      orgId: cloudId,
      project: projData || project, // return project-level result
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("processAudit failed:", error);
    return { success: false, error: error.message || String(error) };
  }
});


resolver.define('setLastScannedAt', async ({ payload }) => {
  const { orgId, ts } = payload || {};
  console.log("ooooo",orgId,ts)
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
  console.log('getLAst***************',val)
  return { lastScannedAt: val ?? null };
});


resolver.define('queryPermissionAuditor', async ({ payload }) => {
  const { query, event = 'permissionaudit', orgId } = payload || {};
  console.log("Json", JSON.stringify({ query, event, orgId }))

  const resp = await fetch('https://forgeapps.clovity.com/v0/api/query', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.APP_RUNNER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, event, orgId })
  });
  console.log("resp*********", resp)
  if (!resp.ok) {
    const text = await resp.text();
    return { success: false, error: `Upstream error ${resp.status}: ${text?.slice(0, 400) || 'Unknown'}` };
  }
  const data = await resp.json();
  return { success: true, data };
});


resolver.define('calculateLastLoginForProject', async ({ payload }) => {
  const { project, allUsers } = payload || {};

  try {
    if (!project?.key) {
      throw new Error("Project key required");
    }

    // ✅ ensure users are indexed
    for (const u of allUsers) userIndex.set(u.accountId, u);

    // 🔹 fetch issues only for this project
    const projectIssues = await getAllIssuesForProject(project.key);

    // 🔹 calculate last login (last activity per user)
    const lastActivityDates = await getUserLastActivityDates({
      issues: projectIssues,
      userDirectory: userIndex,
    });

    // Return clean structure
    return {
      success: true,
      projectKey: project.key,
      projectName: project.displayName,
      users: lastActivityDates,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("calculateLastLoginForProject failed:", error);
    return { success: false, error: error.message || String(error) };
  }
});


/**
 * =========================
 * Fetchers
 * =========================
 */

// async function getAllIssuesForProject(projectKey) {
//   let startAt = 0;
//   const maxResults = 100;
//   const issues = [];

//   while (true) {
//     const response = await api.asApp().requestJira(
//       route`/rest/api/3/search?jql=project=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`
//     );

//     if (!response.ok) {
//       const error = await response.text();
//       console.error(`Failed to fetch issues for ${projectKey}:`, error);
//       break;
//     }

//     const data = await response.json();
//     issues.push(...data.issues);

//     if (startAt + maxResults >= data.total) {
//       break;
//     }
//     startAt += maxResults;
//   }

//   return issues;
// }

resolver.define('getAllIssuesForProject', async ({ payload }) => {
  const { projectKey } = payload || {};
  if (!projectKey) {
    throw new Error("projectKey is required");
  }

  let startAt = 0;
  const maxResults = 100;
  const issues = [];

  while (true) {
    const response = await api.asApp().requestJira(
      route`/rest/api/3/search?jql=project=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to fetch issues for ${projectKey}:`, error);
      throw new Error(error);
    }

    const data = await response.json();
    issues.push(...data.issues);

    if (startAt + maxResults >= data.total) {
      break;
    }
    startAt += maxResults;
  }

  return issues;
});


// 🔹 Example: Get issues for ALL projects
async function getAllProjectsAndIssues() {
  const projects = await getAllJiraProjects()

  console.log("***Projects", projects);


  const allData = [];

  for (const project of projects) {
    const projectIssues = await getAllIssuesForProject(project.key);
    allData.push(...projectIssues);
  }

  return allData;
}




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

async function buildProjectPermissionData(project, allUsers, globalPermissions, lastLoginResults) {
  const [permissionScheme, roleDetails] = await Promise.all([
    getProjectPermissionScheme(project.id),
    getRoleIdScheme(project.id),
  ]);

  const roles = await buildRolesForProject(project.id, roleDetails || [], allUsers, lastLoginResults);

  return {
    projectId: project.id,
    projectName: project.displayName,
    permissionScheme: {
      schemeId: permissionScheme?.id || null,
      schemeName: permissionScheme?.name || null,
      roles,
    },
    globalPermissions,
  };
}

async function buildRolesForProject(projectId, roleDetails, allUsers, lastLoginResults) {
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
            memberSlice.map((actor) => expandActorToUser(actor, allUsers, lastLoginResults))
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
// Utility: Build a global lookup map from lastLoginResults
async function buildLastLoginMap(lastLoginResults) {
  const map = new Map();

  for (const project of lastLoginResults || []) {
    for (const user of project.users || []) {
      const existing = map.get(user.accountId);

      // Keep the most recent activity date across projects
      if (!existing || new Date(user.lastActivityDate) > new Date(existing)) {
        map.set(user.accountId, user.lastActivityDate);
      }
    }
  }

  return map;
}


async function calculateRiskLevel(user, role, baselineRoles) {
  const now = new Date();
  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
  const inactiveDays = lastLogin ? (now - lastLogin) / (1000 * 60 * 60 * 24) : Infinity;

  // Default = low
  let risk = "low";

  // High risk: dormant admins or global roles
  if (role === "Administrators" || user.globalRoles.includes("site-admin")) {
    if (inactiveDays > 90) {
      risk = "high"; // dormant admin
    } else {
      risk = "medium"; // active admin
    }
  }

  // Medium risk: developers with write permissions
  if (role === "Developers" && inactiveDays > 180) {
    risk = "medium";
  }

  // Low risk: viewers or active standard users
  if (role === "Viewers" && inactiveDays < 90) {
    risk = "low";
  }

  // Inactive account
  if (!user.active) {
    risk = "high";
  }

  return risk;
}

// Expand actor → user details
async function expandActorToUser(actor, allUsers, lastLoginResults) {
  const accountId = actor?.actorUser?.accountId;
  if (!accountId) return null;

  // ✅ Always prefer the displayName from allUsers
  const matched = allUsers.find((u) => u.accountId === accountId);
  const displayName = matched?.displayName || actor?.actorUser?.displayName || "NAME NOT FOUND";

  // Build last login map once and reuse
  const lastLoginMap = await buildLastLoginMap(lastLoginResults);
  const lastActivity = lastLoginMap.get(accountId) || null;

  const groupsResp = await getGroupsOnAccId(accountId);
  const groups = Array.isArray(groupsResp)
    ? groupsResp.map((g) => g.name).filter(Boolean)
    : [];

  // 🔹 Build the user object for risk calculation
  const userForRisk = {
    lastLogin: lastActivity,
    active: matched?.active ?? actor?.actorUser?.active ?? true,
    globalRoles: matched?.globalRoles || [], // default empty if not available
  };

  // Pick a role to feed into risk calculation (example: first group or "Unknown")
  const role = groups.length > 0 ? groups[0] : "Unknown";

  // 🔹 Calculate risk level dynamically
  const riskLevel = await calculateRiskLevel(userForRisk, role);

  return {
    accountId,
    displayName,
    lastLogin: lastActivity || "Null",
    riskLevel,
    groups,
    active: userForRisk.active,
  };
}





async function getUserLastActivityDates({ issues, userDirectory }) {
  const presentUserIds = new Set();
  const userLatestActivity = new Map();

  for (const it of issues) {
    const updatedIso =
      it?.fields?.updated || it?.fields?.statuscategorychangedate || it?.fields?.created;

    let d = null;
    if (updatedIso) {
      const parsed = new Date(updatedIso);
      if (!Number.isNaN(parsed.getTime())) {
        d = parsed;
      }
    }

    const assigneeId = it?.fields?.assignee?.accountId;
    const reporterId = it?.fields?.reporter?.accountId;

    if (assigneeId && userDirectory.has(assigneeId)) {
      presentUserIds.add(assigneeId);
      if (d) {
        const cur = userLatestActivity.get(assigneeId);
        if (!cur || d > cur) userLatestActivity.set(assigneeId, d);
      }
    }
    if (reporterId && userDirectory.has(reporterId)) {
      presentUserIds.add(reporterId);
      if (d) {
        const cur = userLatestActivity.get(reporterId);
        if (!cur || d > cur) userLatestActivity.set(reporterId, d);
      }
    }
  }

  // Now build a clean list
  return Array.from(presentUserIds).map((accountId) => {
    const dirEntry = userDirectory.get(accountId);
    const last = userLatestActivity.get(accountId) || null;
    return {
      accountId,
      displayName: dirEntry?.displayName || 'Unknown',
      lastActivityDate: last ? last.toISOString().slice(0, 10) : null,
    };
  });
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


export const handler = resolver.getDefinitions();