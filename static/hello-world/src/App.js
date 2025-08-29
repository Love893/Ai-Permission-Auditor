import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import ChatInterface from './components/ChatInterface';
import FullscreenLoader from "./components/FullscreenLoader";

export default function App() {
  const [initData, setInitData] = useState(null);   // data from initAudit
  const [auditResult, setAuditResult] = useState(null); // result from processAudit
  const [loading, setLoading] = useState(false);
  const [sinceDays, setSinceDays] = useState(90);      
  const [cloudId, setCloudId] = useState('');
  const [runLoading, setRunLoading] = useState(false);
  const [runStatus, setRunStatus] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [lastScannedAt, setLastScannedAt] = useState(null);

  const cooldownActive = false;


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



useEffect(() => {
  (async () => {
    try {
      const res = await invoke('getLastScannedAt', { orgId: cloudId });
      if (res?.lastScannedAt != null) {
        setLastScannedAt(Number(res.lastScannedAt));
      }
    } catch (e) {
      console.warn('Failed to read view context:', e?.message || e);
    }
  })();
}, []);

const start = async () => {
    setRunLoading(true);
    setRunStatus('Fetching project list…');
    const results = [];
    try {
      let processed = 0;
      for (const project of initData.allProjects) {
        setRunStatus(`🚀 Processing project: ${project.key}`);
        // IMPORTANT: use the correct resolver name:
        const result = await invoke("processAudit", {
        cloudId,
        allUsers: initData.allUsers,
        allProjects: [project], // pass single project
        groupedPermissionKeys: initData.groupedPermissionKeys,
      });

      console.log(`✅ Completed audit for project ${project.key}`, result);

      results.push(result);
        processed++;
      }

      const now = Date.now();
      const until = now + 60 * 60 * 1000;
      setLastScannedAt(now);

      try {
        await invoke('setLastScannedAt', { orgId: cloudId, ts: now });
      } catch (e) {
        console.error('Failed to persist lastScannedAt to Forge storage:', e);
      }

      setRunStatus('✅ Completed.');
      setRunLoading(false);
      setShowChat(true);
      return true;
    } catch (e) {
      // show the real error
      console.error(e); 
      setRunStatus(`❌ Failed: ${e?.message || String(e)}`);
      setRunLoading(false);
      return false;
    }
  };

   if (!initData) {
    return <FullscreenLoader />;
  }

  return (
  <>
   <ChatInterface
      start={start}
      showChat={showChat}
      onBack={() => setShowChat(false)}
      onOpenChat={() => setShowChat(true)}
      lastScannedAt={lastScannedAt}
      cooldownActive={cooldownActive}
      runStatus={runStatus}
      runLoading={runLoading}
    />
  </>
  );
}
