import { invoke } from '@forge/bridge';

const CONFIG = {
  USERS_CHECK_BATCH_SIZE: 10,
  PROJECTS_CONCURRENCY: 4,
  ROLES_CONCURRENCY: 6,
  MEMBERS_CONCURRENCY: 10,
  PAGE_SIZE_USERS: 100,
  PAGE_SIZE_PROJECTS: 50,
};

export async function buildProjectPermissionData(project, allUsers, globalPermissions, lastLoginResults) {
//  //console.log("🚀 Starting buildProjectPermissionData for project:", project?.id, project?.displayName);


  const permissionScheme = await invoke("getProjectPermissionScheme", { projectKeyOrId:project.id });
  //console.log("📜 Permission scheme fetched:", permissionScheme);

  const roleDetails = await invoke("getRoleIdScheme", {  projectKeyOrId:project.id });
  //console.log("📌 Role details fetched:", roleDetails);

  const roles = await buildRolesForProject(project.id, roleDetails || [], allUsers, lastLoginResults);
  //console.log("👥 Roles built for project:", project.id, roles);

  const result = {
    projectId: project.id,
    projectKey:project.key,
    projectName: project.displayName,
    permissionScheme: {
      schemeId: permissionScheme?.id || null,
      schemeName: permissionScheme?.name || null,
      roles,
    },
    globalPermissions,
  };

  //console.log("✅ Final project permission data:", result);
  return result;
}

async function buildRolesForProject(projectId, roleDetails, allUsers, lastLoginResults) {
  //console.log(`🔧 buildRolesForProject started for projectId=${projectId}, role count=${roleDetails.length}`);

  if (!Array.isArray(roleDetails) || roleDetails.length === 0) {
    //console.warn(`⚠️ No roles found for project ${projectId}`);
    return [];
  }

  const rolesOut = [];

  for (let i = 0; i < roleDetails.length; i += CONFIG.ROLES_CONCURRENCY) {
    const slice = roleDetails.slice(i, i + CONFIG.ROLES_CONCURRENCY);
    //console.log(`📂 Processing role slice [${i}..${i + slice.length - 1}] for project ${projectId}:`, slice);

    const settled = await Promise.allSettled(
      slice.map(async (role) => {
        //console.log(`➡️ Fetching members for role ${role.name} (${role.id}) in project ${projectId}`);
        const members = await invoke("getRoleUsersScheme", { projectKeyOrId:projectId, roleId: role.id  });

        //console.log(`👤 Members fetched for role ${role.name}:`, members);
        const actors = members?.actors || [];
        // console.log("All Actors",actors)

        const usersWithGroups = [];
        for (let j = 0; j < actors.length; j += CONFIG.MEMBERS_CONCURRENCY) {
          const memberSlice = actors.slice(j, j + CONFIG.MEMBERS_CONCURRENCY);
          //console.log(`   🔍 Expanding actor slice [${j}..${j + memberSlice.length - 1}] for role ${role.name}:`, memberSlice);

          const results = await Promise.allSettled(
            memberSlice.map((actor) => expandActorToUser(actor, allUsers, lastLoginResults , role.name))
          );

          const fulfilledUsers = results
            .filter((r) => r.status === 'fulfilled' && r.value)
            .map((r) => r.value);

          //console.log(`   ✅ Expanded users for role ${role.name}, slice [${j}]:`, fulfilledUsers);
          usersWithGroups.push(...fulfilledUsers);
        }

        const roleResult = { role: role.name, users: usersWithGroups };
        //console.log(`✔️ Completed role ${role.name}:`, roleResult);
        return roleResult;
      })
    );

    rolesOut.push(
      ...settled
        .filter((s) => s.status === 'fulfilled' && s.value)
        .map((s) => s.value)
    );
  }

  //console.log(`🏁 buildRolesForProject completed for projectId=${projectId}:`, rolesOut);
  return rolesOut;
}


async function expandActorToUser(actor, allUsers, lastLoginResults , roleName) {
  // console.log("🔍 expandActorToUser called with actor:", actor);

  const accountId = actor?.actorUser?.accountId;
  if (!accountId) {
    //console.warn("⚠️ No accountId found for actor:", actor);
    return null;
  }
  //console.log("🆔 Processing accountId:", accountId);

  // ✅ Always prefer the displayName from allUsers

//   const matched = allUsers.find((u) => u.accountId === accountId);
const matched = allUsers.find(({ accountId: userAccId }) => {
  //console.log("🔎 Comparing userAccId:", userAccId, "with target accountId:", accountId);
  return userAccId === accountId;
});
  //console.log("👤 Matched user from allUsers:", matched);

  const displayName = matched?.displayName || actor?.displayName || "NAME NOT FOUND";
  //console.log("📛 Final displayName selected:", displayName);

  // Build last login map once and reuse
  const lastLoginMap = await buildLastLoginMap(lastLoginResults);
  //console.log("🗂️ lastLoginMap built:", lastLoginMap);

  const lastActivity = lastLoginMap.get(accountId) || null;
  //console.log("⏰ Last activity for accountId", accountId, ":", lastActivity);

  // Fetch groups
  const groupsResp = await invoke("getGroupsOnAccId", { accountId });
  //console.log("👥 Groups response for accountId", accountId, ":", groupsResp);

  const groups = Array.isArray(groupsResp)
    ? groupsResp.map((g) => g.name).filter(Boolean)
    : [];
  //console.log("📂 Extracted groups for user:", groups);

  // 🔹 Build the user object for risk calculation
  const userForRisk = {
    displayName: displayName,
    lastLogin: lastActivity,
    active: matched?.active ?? actor?.actorUser?.active ?? true,
    globalRoles: matched?.globalRoles || [], // default empty if not available
  };
  // console.log("🛠️ User object built for risk calculation:", userForRisk);

  // Pick a role to feed into risk calculation (example: first group or "Unknown")
  // const role = groups.length > 0 ? groups[0] : "Unknown";
  // console.log("🎭 Role chosen for risk calculation:", role);

  // 🔹 Calculate risk level dynamically
  const riskLevel = await calculateRiskLevel(userForRisk, roleName);
  // console.log("⚡ Risk level calculated:", riskLevel);

  // Final object
  const result = {
    accountId,
    displayName,
    lastLogin: lastActivity,
    riskLevel,
    groups,
    active: userForRisk.active,
  };
  //console.log("✅ Final expanded user result:", result);

  return result;
}


async function buildLastLoginMap(lastLoginResults) {

  //console.log("🚀 buildLastLoginMap called with results:", lastLoginResults);

  if (!lastLoginResults || lastLoginResults.length === 0) {
    //console.warn("⚠️ No projects found in lastLoginResults");
    return new Map();
  }

  const map = new Map();

  for (const project of lastLoginResults) {
   

    if (!project.users || project.users.length === 0) {
      continue;
    }

    for (const user of project.users) {
     

      const existing = map.get(user.accountId);

      if (!existing || new Date(user.lastActivityDate) > new Date(existing)) {
        map.set(user.accountId, user.lastActivityDate);
      } else {
        console.log("   ⏩ Skipping update for", user.accountId, "- existing date is more recent:", existing);
      }
    }
}
  return map;
}


async function calculateRiskLevel(user, role) {

  const now = new Date();
  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
  const inactiveDays = lastLogin ? (now - lastLogin) / (1000 * 60 * 60 * 24) : Infinity;


  // Default = low
  let risk = "low";

  // High risk: dormant admins or global roles
  if (role === "Administrator") {
    if (inactiveDays > 90) {
      risk = "high"; // dormant admin
    } else {
      risk = "medium"; // active admin
    }
  }

  // Medium risk: Member with write permissions
  if (role === "Member" && inactiveDays > 180) {
    risk = "medium";
  }

  // Low risk: viewers or active standard users
  if (role === "Viewer" && inactiveDays < 90) {
    risk = "low";
  }

  // Inactive account
  if (!user.active) {
    risk = "high";
  }

  return risk;
}

