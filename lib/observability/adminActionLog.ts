type AdminActionLog = {
  action: string;
  table: string;
  recordId?: string;
  userEmail?: string;
  error?: string;
};

/** Log leve de ações admin (dev ou ADMIN_ACTION_LOG=1). */
export function logAdminAction(payload: AdminActionLog) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.ADMIN_ACTION_LOG !== "1"
  ) {
    return;
  }

  console.info(
    "[admin-action]",
    JSON.stringify({ ...payload, ts: new Date().toISOString() })
  );
}
