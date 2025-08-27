import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);
  const [cloudId, setCloudId] = useState("");

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true);

        const context = await view.getContext();
        const cloudId = context.cloudId;
        setCloudId(cloudId);

        const result = await invoke("runAudit", { cloudId });
        console.log("runAudit result:", result);

        if (result?.error) {
          setError(result.error);
        } else {
          setAuditData(result);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAudit();
  }, []);

  const sendToDB = async () => {
    if (!auditData) return;
    try {
      const sqsResp = await invoke("sendHardcodedProjectsToSQS", { result: auditData });
      console.log("Data sent to SQS:", sqsResp);
      alert("Data sent to database successfully!");
    } catch (sqsErr) {
      console.error("SQS send failed:", sqsErr);
      alert("Failed to send data to database.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!auditData) return <p>No audit data found</p>;

  return (
    <div style={{ padding: "16px" }}>
      <button onClick={sendToDB}>sendToDB</button>
      <h2>Jira Audit Data</h2>
      <p>
        <strong>Org ID:</strong> {auditData.orgId}
      </p>

      <h3>Projects ({auditData.projects?.length || 0})</h3>
      <ul>
        {auditData.projects?.map((proj) => (
          <li key={proj.projectId}>
            <strong>{proj.projectName}</strong> (ID: {proj.projectId})
          </li>
        ))}
      </ul>

      <h3>Global Permissions</h3>
      <ul>
        {auditData.globalPermissions?.map((perm, idx) => (
          <li key={idx}>
            <strong>{perm.permission}</strong>
            <ul>
              {perm.users?.map((user) => (
                <li key={user.accountId}>
                  {user.displayName} (Last Login: {user.lastLogin}, Risk: {user.riskLevel})
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h3>Baseline Roles</h3>
      <ul>
        {Object.entries(auditData.baselineRoles || {}).map(([role, perms]) => (
          <li key={role}>
            {role}: {perms.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
