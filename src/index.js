import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Main audit resolver
resolver.define('runAudit', async () => {
  try {
    const allUsers = await getAllJiraUsers();
    const allProjects = await getAllJiraProjects();
    // const auditLogRecords = await getAuditLog();
    const allPermissions = await getAllPermissions();
    const projectPermissionSchemes = await getAllProjectPermissionSchemes(allProjects, allUsers, allPermissions);

    // const matchedAuditRecords = auditLogRecords
    //   .filter(record =>
    //     allUsers.some(user => user.accountId === record.authorAccountId && user.accountType === "atlassian")
    //   )
    //   .map(record => {
    //     const user = allUsers.find(u => u.accountId === record.authorAccountId);
    //     return {
    //       accountId: user?.accountId || record.authorAccountId,
    //       displayName: user?.displayName || 'Unknown User',
    //       activities: record?.summary || record?.eventSource || 'No activity details',
    //       rawRecord: record
    //     };
    //   });

    // const permissionResults = await checkPermissionsForAll(allUsers, allProjects);
    

    return {
      success: true,
      data: {
        projectPermissionSchemes,   
      }
    };
  } catch (error) {
    console.error('Audit failed:', error);
    return { success: false, error: error.message };
  }
});

// // Fetch all users
async function getAllJiraUsers() {
  const users = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const response = await api.asApp().requestJira(
      route`/rest/api/3/users/search?startAt=${startAt}&maxResults=${maxResults}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      console.error(`Error fetching users: ${response.status} - ${await response.text()}`);
      break;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    const filteredUsers = data
      .filter(u => u.accountType === "atlassian" && u.accountId && u.displayName)
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        accountType: u.accountType
      }));

    users.push(...filteredUsers);
    startAt += maxResults;
  }

  return users;
}

// --- Fetch all Jira projects ---
async function getAllJiraProjects() {
  const projects = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    const response = await api.asApp().requestJira(
      route`/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      console.error(`Error fetching projects: ${response.status} - ${await response.text()}`);
      break;
    }

    const data = await response.json();
    if (!data?.values || data.values.length === 0) break;

    const filteredProjects = data.values.map(project => ({
      key: project.key,
      id: project.id,
      displayName: project.name
    }));

    projects.push(...filteredProjects);
    startAt += maxResults;
  }
  return projects;
}


async function getAllPermissions() {
  const response = await api.asUser().requestJira(
    route`/rest/api/3/permissions`,
    { headers: { "Accept": "application/json" } }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch permissions: ${response.status} - ${await response.text()}`
    );
  }

  const data = await response.json();

  const allPermissions = Object.values(data.permissions);

  // Only return keys grouped by type
  const groupedPermissionKeys = {
    global: allPermissions
      .filter((perm) => perm.type === "GLOBAL")
      .map((perm) => perm.key),
    project: allPermissions
      .filter((perm) => perm.type === "PROJECT")
      .map((perm) => perm.key),
  };

  // console.log("groupedPermission keys global ***:::",groupedPermissionKeys.global)

  return groupedPermissionKeys;
}


// Check permissions for all user/project combinations
async function checkGlobalPermissionsForAll(users, groupedPermissionKeys) {
  const results = [];

  for (const user of users) {
    try {
      const res = await api.asUser().requestJira(
  route`/rest/api/3/permissions/check`,
  {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ globalPermissions: groupedPermissionKeys.global })
  }
);


      if (res.ok) {
        const json = await res.json();
        results.push({
          user: { accountId: user.accountId, displayName: user.displayName },
          permissions: json.globalPermissions
        });
      } else {
        console.error(
          `Permission check failed for user ${user.accountId} - ${res.status} ${res.statusText}`
        );
        console.error(await res.text());
      }
    } catch (err) {
      console.error(`Error checking global permissions for ${user.accountId}:`, err);
    }
  }
  return results;
}



// Fetch all project permission schemes with role users + groups enrichment
async function getAllProjectPermissionSchemes(projects, users, permissions) {
// compute global permissions once
const globalPermissionsData = await checkGlobalPermissionsForAll(users, permissions);

  // 🔹 now build project-specific schemes
  const schemePromises = projects.map(async (project) => {
    const scheme = await getProjectPermissionScheme(project.id);
    const roleDetails = await getRoleIdScheme(project.id);

    const roleUsersDetails = await Promise.all(
      roleDetails.map(async (role) => {
        const members = await getRoleUsersScheme(project.id, role.id);

        const enrichedActors = await Promise.all(
          (members.actors || []).map(async (actor) => {
            const accountId = actor.actorUser?.accountId;
            let groups = [];

            if (accountId) {
              const groupsResp = await getGroupsOnAccId(accountId);
              groups = groupsResp ? groupsResp.map((g) => g.name) : [];
            }

            return {
              ...actor,
              actorUser: { ...actor.actorUser, groups },
            };
          })
        );

        return {
          roleId: role.id,
          roleName: role.name,
          members: { ...members, actors: enrichedActors },
        };
      })
    );

    scheme.roleUsersDetails = roleUsersDetails;

    return {
      projectId: project.id,
      projectKey: project.key,
      scheme,
      globalPermissionsData, 
    };
  });

  return Promise.all(schemePromises);
}




// Fetch permission scheme for a single project
async function getProjectPermissionScheme(projectKeyOrId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/permissionscheme`,
    { headers: { "Accept": "application/json" }}
  );
  if (!response.ok) {
    console.error(`Error fetching permission scheme for ${projectKeyOrId}: ${response.status} - ${await response.text()}`);
    return null;
  }
  return await response.json();
}

// Fetch role details (just to get IDs & names)
async function getRoleIdScheme(projectKeyOrId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/roledetails`,
    { headers: { "Accept": "application/json" } }
  );
  if (!response.ok) {
    console.error(`Error fetching role details for ${projectKeyOrId}: ${response.status} - ${await response.text()}`);
    return [];
  }
  return await response.json(); 
}

// Fetch members of a specific role
async function getRoleUsersScheme(projectKeyOrId, roleId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKeyOrId}/role/${roleId}`,
    { headers: { "Accept": "application/json" } }
  );
  if (!response.ok) {
    console.error(`Error fetching role users for project ${projectKeyOrId}, role ${roleId}: ${response.status} - ${await response.text()}`);
    return null;
  }
  return await response.json(); 
}

// Fetch groups based on Account ID
async function getGroupsOnAccId(accountId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/user/groups?accountId=${accountId}`,
    { headers: { "Accept": "application/json" } }
  );
  if (!response.ok) {
    console.error(`Error fetching role users for project ${projectKeyOrId}, role ${roleId}: ${response.status} - ${await response.text()}`);
    return null;
  }
  return await response.json(); 
}


export const handler = resolver.getDefinitions();
