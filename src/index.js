import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// --- Fetch Audit Log ---
async function getAuditLog() {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/auditing/record`,
    { headers: { 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    console.error(`Error fetching audit log: ${response.status} - ${await response.text()}`);
    return [];
  }

  const auditRecordData = await response.json();
  return auditRecordData.records || [];
}

// --- Fetch all Jira users ---
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

// --- Check permissions for all user/project combinations ---
async function checkPermissionsForAll(users, projects) {
  const results = [];

  for (const user of users) {
    for (const project of projects) {
      const bodyData = {
        accountId: user.accountId,
        globalPermissions: [
          "ADMINISTER", "BULK_CHANGE", "CREATE_PROJECT", "CREATE_SHARED_OBJECTS",
          "MANAGE_GROUP_FILTER_SUBSCRIPTIONS", "SYSTEM_ADMIN", "USER_PICKER",
          "com.atlassian.atlas.jira__jira-townsquare-link-unconnected-issue-glance-view-permission",
          "io.tempo.jira__tempo-account-administrator", "io.tempo.jira__tempo-administrator",
          "io.tempo.jira__tempo-planner-access", "io.tempo.jira__tempo-projects-access",
          "io.tempo.jira__tempo-projects-administrator", "io.tempo.jira__tempo-projects-viewer",
          "io.tempo.jira__tempo-rate-administrator", "io.tempo.jira__tempo-sage-access",
          "io.tempo.jira__tempo-team-administrator", "io.tempo.jira__tempo-timesheets-access"
        ],
        projectPermissions: [
          {
            permissions: [
              "ADD_COMMENTS", "ADMINISTER_PROJECTS", "ASSIGNABLE_USER", "ASSIGN_ISSUES",
              "BROWSE_PROJECTS", "CLOSE_ISSUES", "CREATE_ATTACHMENTS", "CREATE_ISSUES",
              "DELETE_ALL_ATTACHMENTS", "DELETE_ALL_COMMENTS", "DELETE_ALL_WORKLOGS",
              "DELETE_ISSUES", "DELETE_OWN_ATTACHMENTS", "DELETE_OWN_COMMENTS",
              "DELETE_OWN_WORKLOGS", "EDIT_ALL_COMMENTS", "EDIT_ALL_WORKLOGS",
              "EDIT_ISSUES", "EDIT_ISSUE_LAYOUT", "EDIT_OWN_COMMENTS", "EDIT_OWN_WORKLOGS",
              "EDIT_WORKFLOW", "LINK_ISSUES", "MANAGE_SPRINTS_PERMISSION", "MANAGE_WATCHERS",
              "MODIFY_REPORTER", "MOVE_ISSUES", "RESOLVE_ISSUES", "SCHEDULE_ISSUES",
              "SERVICEDESK_AGENT", "SET_ISSUE_SECURITY", "TRANSITION_ISSUES",
              "UNARCHIVE_ISSUES", "VIEW_AGGREGATED_DATA", "VIEW_DEV_TOOLS",
              "VIEW_READONLY_WORKFLOW", "VIEW_VOTERS_AND_WATCHERS", "WORK_ON_ISSUES",
              "io.tempo.jira__log-work-for-others", "io.tempo.jira__set-billable-hours",
              "io.tempo.jira__view-all-worklogs", "io.tempo.jira__view-issue-hours"
            ],
            projects: [parseInt(project.id)]
          }
        ]
      };

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
        results.push({
          user: { accountId: user.accountId, displayName: user.displayName },
          project: { id: project.id, key: project.key, displayName: project.displayName },
          permissions: json
        });
      }
    }
  }

  return results;
}

// --- Main audit resolver ---
resolver.define('runAudit', async () => {
  try {
    const allUsers = await getAllJiraUsers();
    const allProjects = await getAllJiraProjects();
    const auditLogRecords = await getAuditLog();

   // Match and enrich audit records with user details
const matchedAuditRecords = auditLogRecords
  .filter(record =>
    allUsers.some(user => user.accountId === record.authorAccountId && user.accountType === "atlassian")
  )
  .map(record => {
    const user = allUsers.find(u => u.accountId === record.authorAccountId);
    return {
      accountId: user?.accountId || record.authorAccountId,
      displayName: user?.displayName || 'Unknown User',
      activities: record?.summary || record?.eventSource || 'No activity details',
      rawRecord: record
    };
  });

console.log("Matched Audit Records with User Info:", matchedAuditRecords);


    const permissionResults = await checkPermissionsForAll(allUsers, allProjects);

    return { 
      success: true, 
      data: { 
        allProjects, 
        allUsers, 
        matchedAuditRecords,
        permissionResults 
      } 
    };
  } catch (error) {
    console.error('Audit failed:', error);
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();
