export async function getPayload(buildProjectPermissionData,cloudId){
    const sendToUploadServicePayload = {
        event: "permissionaudit",
        orgId: cloudId,
        data:  [buildProjectPermissionData],
        timestamp: new Date().toISOString(),
    };

    return sendToUploadServicePayload;
}