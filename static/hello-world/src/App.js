import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import ChatInterface from './components/ChatInterface';
import FullscreenLoader from "./components/FullscreenLoader";
import { calculateLastLoginForProject } from "./utils/CalculateLastLoginForProject";
import { checkPermissions } from "./utils/CheckPermission";
import { getPayload } from "./utils/GetPayLoad";
import { buildProjectPermissionData } from "./utils/buildProjectPermissionData";

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
        // console.log("Context",context)
        const cid = context.cloudId;
        setCloudId(cid);

        // Step 1: call initAudit
        // const initRes = await invoke("initAudit", { cloudId: cid });
       const allUsers= await invoke ("getAllJiraUsers")
       const allProjects = await invoke ("getAllJiraProjects")
       const groupedPermissionKeys = await invoke("getAllPermissions")
       const initRes = {
      success: true,
      allUsers,
      allProjects,
      groupedPermissionKeys,
    };
        console.log("Init Response",initRes)
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



useEffect(() => {
  (async () => {
    try {
      const context = await view.getContext();
        const cloudId = context.cloudId;
      const res = await invoke('getLastScannedAt', { orgId: cloudId });
      // console.log("getlastScanned :",res)
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
      const lastLoginResp = await calculateLastLoginForProject({project , allUsers:initData.allUsers})
      // console.log(`LastLoginResp [${project.key}]***`, lastLoginResp);

      const globalPermissions = await checkPermissions(initData.allUsers,initData.groupedPermissionKeys.global)
      // console.log("globalpermission******",globalPermissions)
      const buildProjectPermissionDatas = await buildProjectPermissionData(project, initData.allUsers, globalPermissions ,[lastLoginResp] )
      // console.log("buildProj*****",buildProjectPermissionDatas)

      const payload = await getPayload(buildProjectPermissionDatas , cloudId);

      
      console.log(`✅ Completed audit for project ${project.key}`, payload);

      await invoke("sendToSqs",{payload})
     processed++;
    }

    const now = Date.now();
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
    console.error(e);
    setRunStatus(`❌ Failed: ${e?.message || String(e)}`);
    setRunLoading(false);
    return false;
  }
};

// console.log("last:",lastScannedAt)


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
