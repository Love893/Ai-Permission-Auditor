import React, { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded

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
    <>
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

            const projectPerms = result.permissions.projectPermissions
            const allProjectPermissions = projectPerms.map((perm) => perm.permission);
           
            return (
              <React.Fragment key={idx}>
                <tr>
                  <td>{result.user.displayName}</td>
                  <td>{result.project.displayName}</td>
                  <td>
                    {globalPerms.length > 0 && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedRow(
                            expandedRow === `global-${idx}`
                              ? null
                              : `global-${idx}`
                          );
                        }}
                        style={{ color: "blue", cursor: "pointer" }}
                      >
                        View Global Permissions
                      </a>
                    )}
                  </td>
                  <td>
                    {(
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedRow(
                            expandedRow === `project-${idx}`
                              ? null
                              : `project-${idx}`
                          );
                        }}
                        style={{ color: "blue", cursor: "pointer" }}
                      >
                        View Project Permissions
                      </a>
                    )}
                  </td>
                </tr>

                {/* Expanded Global Permissions */}
                {expandedRow === `global-${idx}` && (
                  <tr>
                    <td colSpan="4" style={{ background: "#f9f9f9" }}>
                      <strong>All Global Permissions:</strong>
                      <ul>
                        {globalPerms.length > 0 ? (
                          globalPerms.map((perm, i) => <li key={i}>{perm}</li>)
                        ) : (
                          <li>No permissions found</li>
                        )}
                      </ul>
                    </td>
                  </tr>
                )}

                {/* Expanded Project Permissions */}
                {expandedRow === `project-${idx}` && (
                  <tr>
                    <td colSpan="4" style={{ background: "#f9f9f9" }}>
                      <strong>All Project Permissions:</strong>
                      <ul>
                        {allProjectPermissions.length > 0 ? (
                          allProjectPermissions.map((perm, i) => <li key={i}>{perm}</li>)
                        ) : (
                          <li>No permissions found</li>
                        )}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
