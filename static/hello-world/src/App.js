import React, { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true);
        const result = await invoke("runAudit");
        console.log("Audit result:", result);

        if (result.success) {
          setAuditData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAudit();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  if (!auditData) return null;

  return (
    <div style={{ padding: "16px" }}>
      <h2>Jira Audit Data</h2>

      <h3>Projects ({auditData.allProjects.length})</h3>
      <ul>
        {auditData.allProjects.map((proj) => (
          <li key={proj.key}>
            <strong>{proj.key}</strong> — {proj.displayName}
          </li>
        ))}
      </ul>

      <h3>Users ({auditData.allUsers.length})</h3>
      <ul>
        {auditData.allUsers.map((user) => (
          <li key={user.accountId}>{user.displayName}</li>
        ))}
      </ul>

      <h3>Permission Results</h3>
      <table
        border="1"
        cellPadding="6"
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginTop: "10px",
          fontSize: "14px"
        }}
      >
        <thead>
          <tr>
            <th>User</th>
            <th>Project</th>
            <th>Global Permissions</th>
            <th>Project Permissions</th>
          </tr>
        </thead>
        <tbody>
          {auditData.permissionResults.map((result, idx) => {
            const globalPerms = result.permissions.globalPermissions
              ? Object.entries(result.permissions.globalPermissions)
                  .filter(([_, val]) => val.havePermission)
                  .map(([perm]) => perm)
              : [];

            const projectPerms = result.permissions.projectPermissions
              ? Object.entries(result.permissions.projectPermissions)
                  .filter(([_, val]) => val.havePermission)
                  .map(([perm]) => perm)
              : [];

            return (
              <tr key={idx}>
                <td>{result.user.displayName}</td>
                <td>{result.project.displayName}</td>
                <td>{globalPerms.join(", ") || "None"}</td>
                <td>{projectPerms.join(", ") || "None"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
