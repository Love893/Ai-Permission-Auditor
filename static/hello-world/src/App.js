import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";

export default function App() {
  const [cloudId, setCloudId] = useState("");
  const [initData, setInitData] = useState(null);   // data from initAudit
  const [auditResult, setAuditResult] = useState(null); // result from processAudit
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInitData() {
      try {
        const context = await view.getContext();
        const cid = context.cloudId;
        setCloudId(cid);

        // Step 1: call initAudit
        const initRes = await invoke("initAudit", { cloudId: cid });
        console.log("InitRes***",initRes)
        if (initRes.success) {
          setInitData(initRes);
        } else {
          console.error("initAudit failed:", initRes.error);
        }
      } catch (err) {
        console.error("Error fetching init data:", err);
      }
    }

    fetchInitData();
  }, []);

  // Step 2: processAudit on button click
async function runAudit() {
  if (!initData) return;
  setLoading(true);

  const results = [];

  try {
    for (const project of initData.allProjects) {
      console.log(`🚀 Auditing project: ${project.key} (${project.id})`);

      const result = await invoke("processAudit", {
        cloudId,
        allUsers: initData.allUsers,
        allProjects: [project], // pass single project
        groupedPermissionKeys: initData.groupedPermissionKeys,
      });

      console.log(`✅ Completed audit for project ${project.key}`, result);

      results.push(result);

      // 👉 Optional: update UI incrementally as projects finish
      setAuditResult((prev) => [...(prev || []), result]);
    }

    console.log("🎯 Final Results (all projects):", results);
  } catch (err) {
    console.error("processAudit loop failed:", err);
  } finally {
    setLoading(false);
  }
}


useEffect(()=>{
runAudit()
},[initData])


 

  return (
    <div style={{ padding: "1rem" }}>
      {!initData && <p>Loading initial data...</p>}
    </div>
  );
}
