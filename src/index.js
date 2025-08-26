import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Main audit resolver
resolver.define('runAudit', async () => {
  try {
    const allUsers = await getAllJiraUsers();
    const allProjects = await getAllJiraProjects();
    const allPermissions = await getAllPermissions();
    const permissionResults = await checkPermissionsForAll(allUsers, allProjects ,allPermissions);

    return {
      success: true,
      data: {
        allProjects,
        allUsers,
        allPermissions,
        permissionResults
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
    if (!Array.isArray(data)) {
      console.error(`Unexpected user data:`, data);
      break;
    }

    if (data.length === 0) break; // no more results

    const filteredUsers = data
      .filter(u => u.accountType === "atlassian" && u.accountId && u.displayName)
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName
      }));

    users.push(...filteredUsers);
    startAt += maxResults;
  }

  return users;
}

// Fetch all projects
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
async function checkPermissionsForAll(users, projects , groupedPermissionKeys) {
  const results = [];

  for (const user of users) {
    for (const project of projects) {
      const bodyData = {
        accountId: user.accountId,
        globalPermissions: groupedPermissionKeys.global
      };

    try {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/permissions/check`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    }
  );

  if (res.ok) {
    const json = await res.json();
    // console.log('permission check result:', json.globalPermissions);
    results.push({
      user: { accountId: user.accountId, displayName: user.displayName },
      project: { id: project.id, key: project.key, displayName: project.displayName },
      permissions: json
    });
  } else {
    console.error(
      `Permission check failed for user ${user.accountId} in project ${project.id} - ${res.status} ${res.statusText}`
    );
    console.error(await res.text()); // print error details
  }
} catch (err) {
  console.error(
    `Error checking permissions for ${user.accountId} in project ${project.id}:`,
    err
  );
}
  }
  }
  return results;
}
export const handler = resolver.getDefinitions();
