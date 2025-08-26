import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";

export default function App() {
  const [result, setResult] = useState(null);
  const [cloudId, setCloudId] = useState("");

  useEffect(() => {
    async function fetchAudit() {
      try {
        const context = await view.getContext()
    const cloudId = context.cloudId;
    setCloudId(cloudId);
        const result = await invoke("runAudit" ,  { cloudId });
        setResult(result)
        // console.log("Result:", result);
      } catch (err) {
        console.log("error",err);
      }
    }

    fetchAudit();
  }, []);

  console.log(result)

async function sendtodb() {
  const datasendtodb =await invoke("sendHardcodedProjectsToSQS", { result });
  console.log("SQS data sent ", datasendtodb);  
}

return (
  <>
    <button onClick={sendtodb}>SendToDB</button>
  </>
);

}
