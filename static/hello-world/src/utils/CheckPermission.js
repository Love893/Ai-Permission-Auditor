import { invoke } from '@forge/bridge';

export async function checkPermissions(allUsers, globalPermissions) {
//   console.log("🔍 Starting permission check...");
//   console.log("📊 Total users to check:", allUsers.length);
//   console.log("🛡️ Global permissions being checked:", globalPermissions);

  let results = [];

  for (const [index, user] of allUsers.entries()) {
    // console.log(`➡️ Checking permissions for user [${index + 1}/${allUsers.length}]:`, user.displayName || user.accountId);

    try {
      const result = await invoke('checkUserPermissions', {
        displayName:user.displayName,
        accountId: user.accountId,
        globalPermissions,
      });

    //   console.log(`✅ Result for ${user.displayName || user.accountId}:`, result);
      results.push({ result });
    } catch (err) {
      console.error(`❌ Error checking permissions for ${user.displayName || user.accountId}:`, err);
      results.push({ user: user.displayName || user.accountId, error: err.message });
    }
  }

//   console.log("🎯 Final Users Permission Results:", results);
//   console.log("✔️ Permission check completed.");

  return results;
}
