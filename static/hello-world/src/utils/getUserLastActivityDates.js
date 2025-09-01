export async function getUserLastActivityDates({ issues, userDirectory }) {
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