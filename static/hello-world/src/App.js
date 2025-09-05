import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import ChatInterface from './components/ChatInterface';
import { calculateLastLoginForProject } from "./utils/CalculateLastLoginForProject";
import { checkPermissions } from "./utils/CheckPermission";
import { getPayload } from "./utils/GetPayLoad";
import { buildProjectPermissionData } from "./utils/buildProjectPermissionData";
import { getPermissionAuditorContent } from './content/permission-auditor.content';

export default function App() {
  const [initData, setInitData] = useState(null);   // data from initAudit
  const [auditResult, setAuditResult] = useState(null); // result from processAudit
  const [loading, setLoading] = useState(false);
  const [sinceDays, setSinceDays] = useState(90);      
  const [cloudId, setCloudId] = useState('');
  const [runLoading, setRunLoading] = useState(false);
  const [runStatus, setRunStatus] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [locale, setLocale] = useState(''); 
  const [content, setContent] = useState(getPermissionAuditorContent(''));
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
        // console.log("Init Response",initRes)
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
      const loc = context?.locale || 'en_US';
        // console.log('Resolved locale from context:', loc);
        setLocale(loc);
        const resolvedContent = getPermissionAuditorContent(loc);
        // console.log('Resolved content pack for locale:', loc, '->', resolvedContent?.heroTitle || 'Unknown');
        setContent(resolvedContent);
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
    const keys = initData.allProjects.map(p => p.key); // get all project keys
    const total = keys.length;

    for (const project of initData.allProjects) {
      const projectKey = project.key;
      setRunStatus(`Processing ${projectKey} (${processed + 1}/${total})…`);

      const lastLoginResp = await calculateLastLoginForProject({
        project,
        allUsers: initData.allUsers
      });

      const globalPermissions = await checkPermissions(
        initData.allUsers,
        initData.groupedPermissionKeys.global
      );

      const buildProjectPermissionDatas = await buildProjectPermissionData(
        project,
        initData.allUsers,
        globalPermissions,
        [lastLoginResp]
      );

      const payload = await getPayload(buildProjectPermissionDatas, cloudId);

      // console.log(`✅ Completed audit for project ${projectKey}`, payload);

      await invoke("sendToSqs", { payload });
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
    console.log(`❌ Failed: ${e?.message || String(e)}`);
    setRunStatus(content?.defaultRetry?.retryMessage || 'Please retry');
    setRunLoading(false);
    return false;
  }
};

// console.log("last:",lastScannedAt)


if (!locale || !content || !initData ) {
    // Optional: minimal placeholder while we read context/locale
    return (
      <div 
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center text-base"
      >
         Loading |  Laden |  Chargement | Cargando
      </div>
    );
    // Or simply: return null;
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
      content={content}
      locale={locale}
    />
  </>
  );
}
