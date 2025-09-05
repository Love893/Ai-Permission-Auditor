export async function getPayload(buildProjectPermissionData,cloudId){
    const sqsPayload = {
        event: "permissionaudit",
        orgId: cloudId,
        data:  [buildProjectPermissionData],
        timestamp: new Date().toISOString(),
    };

    return sqsPayload;
}