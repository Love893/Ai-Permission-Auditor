import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded
  const [cloudId, setCloudId] = useState("");

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true);
        const context = await view.getContext()
    const cloudId = context.cloudId;
    setCloudId(cloudId);
        const result = await invoke("runAudit" ,  { cloudId });
        setResult(result)
        // console.log("Result:", result);
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

  console.log(result)

async function sendtodb() {
  const datasendtodb =await invoke("sendHardcodedProjectsToSQS", { result });
  console.log("SQS data sent",datasendtodb);
  
}

return (
  <>
    <button onClick={sendtodb}>SendToDB</button>
  </>
);

}
