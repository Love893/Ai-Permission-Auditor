import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded
  const [cloudId, setCloudId] = useState("");

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

  // if (loading) return <p>Loading...</p>;
  // if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  // if (!auditData) return null;


  useEffect(() => {
    async function context() {
    const context = await view.getContext()
    const cloudId = context.cloudId;
    setCloudId(cloudId);
    const result = await invoke("runAudit" , { cloudId });
    console.log("Result:", result);
     
    }

    context();
  }, []);


  return (
    <>
    <div style={{ padding: "16px" }}>
      {/* <h2>Jira Audit Data</h2>

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
    fontSize: "14px",
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
    {(Array.isArray(auditData.allPermissions) ? auditData.allPermissions : []).map(
      (result, idx) => {
        const globalPerms = result.global || [];
        const projectPerms = result.project || [];

        return (
          <tr key={idx}>
            <td>{result.user?.displayName || "Unknown User"}</td>
            <td>{result.project?.displayName || "Unknown Project"}</td>
            <td>
              {globalPerms.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {globalPerms.map((perm, i) => (
                    <li key={i}>{perm}</li>
                  ))}
                </ul>
              ) : (
                "No global permissions"
              )}
            </td>
            <td>
              {projectPerms.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {projectPerms.map((perm, i) => (
                    <li key={i}>{perm}</li>
                  ))}
                </ul>
              ) : (
                "No project permissions"
              )}
            </td>
          </tr>
        );
      }
    )}
  </tbody>
</table>
 */}


    </div>
    </>
  );
}
