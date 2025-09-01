import { invoke } from "@forge/bridge";
import { getUserLastActivityDates } from "./getUserLastActivityDates";


export async function calculateLastLoginForProject({ project, allUsers }) {
    const userIndex = new Map(); // accountId -> user
  try {
    if (!project?.key) {
      throw new Error("Project key required");
    }

    // ✅ ensure users are indexed
    for (const u of allUsers) {
      userIndex.set(u.accountId, u);
    }

    // 🔹 fetch issues only for this project
    const projectIssues = await invoke("getAllIssuesForProject",{projectKey: project.key});

    // 🔹 calculate last login (last activity per user)
    const lastActivityDates = await getUserLastActivityDates({
      issues: projectIssues,
      userDirectory: userIndex,
    });

    // ✅ return clean structured data
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
}
