import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';
import { getUserLastActivityDates } from '../static/hello-world/src/utils/getUserLastActivityDates';
import { logger } from './utils/logger';

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


resolver.define('setLastScannedAt', async ({ payload }) => {
  try {
    const { orgId, ts } = payload || {};
    // logger.info("setLastScannedAt called", { orgId, ts });

    if (!orgId || typeof ts !== 'number') {
      logger.warn("Invalid input in setLastScannedAt", { orgId, ts });
      return { success: false, error: 'orgId and numeric ts required' };
    }

    const key = `lastScannedAt:${orgId}`;
    await storage.set(key, ts);

    // logger.info("Successfully stored lastScannedAt", { key, ts });

    return { success: true };
  } catch (err) {
    logger.error("Error in setLastScannedAt", { error: err.message, stack: err.stack });
    return { success: false, error: err.message || String(err) };
  }
});



resolver.define('getLastScannedAt', async ({ payload }) => {
  try {
    const { orgId } = payload || {};
    if (!orgId) {
      logger.warn("getLastScannedAt called without orgId");
      return { lastScannedAt: null };
    }

    const key = `lastScannedAt:${orgId}`;
    // logger.debug("Fetching lastScannedAt key", { key });

    const val = await storage.get(key); // number (ms) or undefined
    // logger.info("Fetched lastScannedAt value", { key, value: val });

    return { lastScannedAt: val ?? null };
  } catch (err) {
    logger.error("Error in getLastScannedAt", { error: err.message, stack: err.stack });
    return { lastScannedAt: null, error: err.message || String(err) };
  }
});


resolver.define('queryPermissionAuditor', async ({ payload }) => {
  try {
    const { query, event = 'permissionaudit', orgId , locale, userId } = payload || {};

    logger.debug("queryPermissionAuditor called", { query, event, orgId , locale , userId});

    const resp = await fetch('https://forge.clovity.com/v0/api/query', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.APP_RUNNER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, event, orgId , locale, userId })
    });

    logger.info("Upstream response received", { status: resp.status, ok: resp.ok });

    if (!resp.ok) {
      const text = await resp.text();
      logger.error("Upstream error in queryPermissionAuditor", { status: resp.status, message: text?.slice(0, 400) || 'Unknown' });
      return { 
        success: false, 
        error: `Upstream error ${resp.status}: ${text?.slice(0, 400) || 'Unknown'}` 
      };
    }

    const data = await resp.json();
    // logger.info("queryPermissionAuditor succeeded", { data });

    return { success: true, data };

  } catch (err) {
    logger.error("queryPermissionAuditor failed", { error: err.message, stack: err.stack });
    return { success: false, error: err.message || String(err) };
  }
});




resolver.define('calculateLastLoginForProject', async ({ payload }) => {
  const { project, allUsers } = payload || {};

  try {
    if (!project?.key) {
      logger.warn("Project key missing in calculateLastLoginForProject", { payload });
      throw new Error("Project key required");
    }

    // logger.info("Calculating last login for project", { projectKey: project.key, projectName: project.displayName });

    // ✅ ensure users are indexed
    for (const u of allUsers) userIndex.set(u.accountId, u);
    // logger.debug("User index populated", { userCount: allUsers.length });

    // 🔹 fetch issues only for this project
    const projectIssues = await getAllIssuesForProject(project.key);
    // logger.info("Fetched project issues", { projectKey: project.key, issueCount: projectIssues.length });

    // 🔹 calculate last login (last activity per user)
    const lastActivityDates = await getUserLastActivityDates({
      issues: projectIssues,
      userDirectory: userIndex,
    });
    // logger.info("Calculated last activity dates for users", { userCount: lastActivityDates.length });

    // Return clean structure
    return {
      success: true,
      projectKey: project.key,
      projectName: project.displayName,
      users: lastActivityDates,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("calculateLastLoginForProject failed", { error: error.message, stack: error.stack, projectKey: project?.key });
    return { success: false, error: error.message || String(error) };
  }
});



resolver.define('sendToUploadService', async ({ payload }) => {
  try {
    const payloadData = payload.payload;
    const payloadString = JSON.stringify(payloadData);
    const payloadSizeKB = (payloadString.length / 1024).toFixed(2);

    // console.log("i am data ",payloadString)

    logger.info("Payload size before sending to SQS", { sizeKB: payloadSizeKB, length: payloadString.length });
    logger.debug("Payload JSON", { payload: payloadData });

    const res = await fetch('https://forge.clovity.com/v0/api/sqs/send', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.APP_RUNNER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: payloadString,
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to send payload to backend service************", { status: res.status, errorText, payloadLength: payloadData.length });
      return { success: false, error: errorText };
    }

    const data = await res.json();
    logger.info("Payload sent successfully to backend service", { response: data, payloadLength: payloadData.length });

    return { success: true, data };
   
  } catch (err) {
    logger.error("Error sending payload to backend service******************", { error: err.message, stack: err.stack });
    return { success: false, error: err.message || String(err) };
  }
});




resolver.define('getAllIssuesForProject', async ({ payload }) => {
  try {
    const { projectKey } = payload || {};
    if (!projectKey) {
      logger.warn("getAllIssuesForProject called without projectKey", { payload });
      throw new Error("projectKey is required");
    }

    const issues = [];
    let nextPageToken = null;
    let isLast = false;

    // Keep ORDER BY stable for consistent pagination
    const jql = `project = '${projectKey}' ORDER BY created ASC`;

    while (!isLast) {
     const body = {
  jql,
  maxResults: 100,
  nextPageToken: nextPageToken || undefined,
  fields: ["*all"]
};


      const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to fetch issues for project", {
          projectKey,
          status: response.status,
          error: errorText,
        });
        throw new Error(errorText);
      }

      const data = await response.json();
      issues.push(...(data.issues || []));

      nextPageToken = data.nextPageToken || null;
      isLast = data.isLast === true;
    }

    logger.info("Completed fetching all issues for project", {
      projectKey,
      totalFetched: issues.length,
    });

    return issues;
  } catch (err) {
    logger.error("Error in getAllIssuesForProject", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
});




resolver.define('getAllJiraUsers', async () => {
  try {
    const users = [];
    let startAt = 0;

    // logger.info("Starting to fetch all Jira users");

    while (true) {
      const res = await api.asUser().requestJira(
        route`/rest/api/3/users/search?startAt=${startAt}&maxResults=${CONFIG.PAGE_SIZE_USERS}`,
        { headers: { Accept: 'application/json' } }
      );

      if (!res.ok) {
        const errorText = await res.text();
        logger.error("Error fetching Jira users", { status: res.status, errorText, startAt });
        throw new Error(`Failed to fetch users: ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        logger.info("No more users to fetch, ending pagination", { startAt });
        break;
      }

      const filteredUsers = data
        .filter((u) => u.accountType === 'atlassian' && u.accountId && u.displayName)
        .map((u) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          active: u.active ?? true,
        }));

      users.push(...filteredUsers);
      // logger.debug("Fetched a batch of Jira users", { batchCount: filteredUsers.length, startAt, totalFetched: users.length });

      startAt += CONFIG.PAGE_SIZE_USERS;
    }

    // logger.info("Completed fetching all Jira users", { totalUsers: users.length });
    return users;
  } catch (err) {
    logger.error("Error in getAllJiraUsers", { error: err.message, stack: err.stack });
    throw err;
  }
});



/**
 * 🔹 Get all Jira Projects
 */
resolver.define('getAllJiraProjects', async () => {
  try {
    const projects = [];
    let startAt = 0;

    // logger.info("Starting to fetch all Jira projects");

    while (true) {
      const res = await api.asUser().requestJira(
        route`/rest/api/3/project/search?startAt=${startAt}&maxResults=${CONFIG.PAGE_SIZE_PROJECTS}&typeKey=software`,
        { headers: { Accept: 'application/json' } }
      );

      if (!res.ok) {
        const errorText = await res.text();
        logger.error("Error fetching Jira projects", { status: res.status, errorText, startAt });
        throw new Error(`Failed to fetch projects: ${res.status}`);
      }

      const data = await res.json();
      const values = data?.values || [];
      if (values.length === 0) {
        logger.info("No more projects to fetch, ending pagination", { startAt });
        break;
      }

      const mappedProjects = values.map((p) => ({
        key: p.key,
        id: p.id,
        displayName: p.name,
      }));

      projects.push(...mappedProjects);
      // logger.debug("Fetched a batch of Jira projects", { batchCount: mappedProjects.length, startAt, totalFetched: projects.length });

      startAt += CONFIG.PAGE_SIZE_PROJECTS;
    }

    // logger.info("Completed fetching all Jira projects", { totalProjects: projects.length });
    return projects;
  } catch (err) {
    logger.error("Error in getAllJiraProjects", { error: err.message, stack: err.stack });
    throw err;
  }
});


/**
 * 🔹 Get all Permissions (Global & Project)
 */
resolver.define('getAllPermissions', async () => {
  try {
    // logger.info("Fetching all Jira permissions");

    const res = await api.asUser().requestJira(route`/rest/api/3/permissions`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to fetch Jira permissions", { status: res.status, errorText });
      throw new Error(`Failed to fetch permissions: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const allPermissions = Object.values(data?.permissions || {});

    const globalPermissions = allPermissions.filter((p) => p.type === 'GLOBAL').map((p) => p.key);
    const projectPermissions = allPermissions.filter((p) => p.type === 'PROJECT').map((p) => p.key);

    // logger.info("Fetched Jira permissions successfully", { globalCount: globalPermissions.length, projectCount: projectPermissions.length });

    return {
      global: globalPermissions,
      project: projectPermissions,
    };
  } catch (err) {
    logger.error("Error in getAllPermissions", { error: err.message, stack: err.stack });
    throw err;
  }
});

/**
 * =========================
 * Global permission checks
 * =========================
 */

resolver.define('checkUserPermissions', async ({ payload }) => {
  try {
    const { accountId, globalPermissions, displayName } = payload || {};

    if (!accountId) {
      logger.error("accountId is missing in payload", { payload });
      throw new Error('accountId is required');
    }

    if (!Array.isArray(globalPermissions) || globalPermissions.length === 0) {
      logger.error("globalPermissions is invalid", { globalPermissions });
      throw new Error('globalPermissions must be a non-empty array');
    }

    // logger.info("Checking global permissions for user", { accountId, displayName });

    const res = await api.asUser().requestJira(route`/rest/api/3/permissions/check`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, globalPermissions }),
    });

    if (!res.ok) {
      logger.error("Global permission check failed", { accountId, status: res.status, statusText: res.statusText });
      return {
        user: { accountId },
        error: `Request failed with status ${res.status}`,
      };
    }

    const json = await res.json();
    const permissions = json?.globalPermissions || [];

    // logger.info("Global permissions check successful", { accountId, permissions });

    return {
      user: { accountId, displayName },
      permissions,
    };
  } catch (err) {
    logger.error("Error in checkUserPermissions", { error: err.message, stack: err.stack, accountId: payload?.accountId });
    throw err;
  }
});


/**
 * 🔹 Get project permission scheme
 * payload = { projectKeyOrId: string }
 */
resolver.define('getProjectPermissionScheme', async ({ payload }) => {
  try {
    const { projectKeyOrId } = payload || {};
    if (!projectKeyOrId) {
      logger.error("projectKeyOrId is missing in payload", { payload });
      throw new Error('projectKeyOrId is required');
    }

    // logger.info("Fetching permission scheme for project", { projectKeyOrId });

    const res = await api.asUser().requestJira(
      route`/rest/api/3/project/${projectKeyOrId}/permissionscheme`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to fetch permission scheme", { projectKeyOrId, status: res.status, errorText });
      throw new Error(`Failed to fetch permission scheme: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    // logger.info("Fetched permission scheme successfully", { projectKeyOrId });

    return data;
  } catch (err) {
    logger.error("Error in getProjectPermissionScheme", { error: err.message, stack: err.stack, projectKeyOrId: payload?.projectKeyOrId });
    throw err;
  }
});


/**
 * 🔹 Get all role definitions in a project
 * payload = { projectKeyOrId: string }
 */
resolver.define('getRoleIdScheme', async ({ payload }) => {
  try {
    const { projectKeyOrId } = payload || {};
    if (!projectKeyOrId) {
      logger.error("projectKeyOrId is missing in payload", { payload });
      throw new Error('projectKeyOrId is required');
    }

    // logger.info("Fetching role details for project", { projectKeyOrId });

    const res = await api.asUser().requestJira(
      route`/rest/api/3/project/${projectKeyOrId}/roledetails`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to fetch role details", { projectKeyOrId, status: res.status, errorText });
      throw new Error(`Failed to fetch role details: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    // logger.info("Fetched role details successfully", { projectKeyOrId });

    return data;
  } catch (err) {
    logger.error("Error in getRoleIdScheme", { error: err.message, stack: err.stack, projectKeyOrId: payload?.projectKeyOrId });
    throw err;
  }
});


/**
 * 🔹 Get all users in a specific project role
 * payload = { projectKeyOrId: string, roleId: string }
 */
resolver.define('getRoleUsersScheme', async ({ payload }) => {
  try {
    const { projectKeyOrId, roleId } = payload || {};
    if (!projectKeyOrId || !roleId) {
      logger.error("projectKeyOrId or roleId missing in payload", { payload });
      throw new Error('projectKeyOrId and roleId are required');
    }

    // logger.info("Fetching role users for project", { projectKeyOrId, roleId });

    const res = await api.asUser().requestJira(
      route`/rest/api/3/project/${projectKeyOrId}/role/${roleId}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to fetch role users", { projectKeyOrId, roleId, status: res.status, errorText });
      throw new Error(`Failed to fetch role users: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    // logger.info("Fetched role users successfully", { projectKeyOrId, roleId });

    return data;
  } catch (err) {
    logger.error("Error in getRoleUsersScheme", { error: err.message, stack: err.stack, projectKeyOrId: payload?.projectKeyOrId, roleId: payload?.roleId });
    throw err;
  }
});


/**
 * 🔹 Get groups for a given accountId
 * payload = { accountId: string }
 */
resolver.define('getGroupsOnAccId', async ({ payload }) => {
  try {
    const { accountId } = payload || {};
    if (!accountId) {
      logger.error("accountId is missing in payload", { payload });
      throw new Error('accountId is required');
    }

    // ✅ Use cache if available
    if (groupCache.has(accountId)) {
      logger.debug("Returning cached groups for account", { accountId });
      return groupCache.get(accountId);
    }

    // logger.info("Fetching groups for account", { accountId });

    const res = await api.asUser().requestJira(
      route`/rest/api/3/user/groups?accountId=${accountId}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      logger.error("Group fetch failed", { accountId, status: res.status });
      groupCache.set(accountId, []);
      return [];
    }

    const data = await res.json();
    groupCache.set(accountId, data || []);
    // logger.info("Fetched groups successfully", { accountId, groupCount: (data || []).length });

    return data || [];
  } catch (err) {
    logger.error("Error in getGroupsOnAccId", { error: err.message, stack: err.stack, accountId: payload?.accountId });
    throw err;
  }
});


export const handler = resolver.getDefinitions();