/** Extrai metadados de auditoria a partir do Request. */

export type RequestAuditMeta = {
  ip: string | null;
  user_agent: string | null;
};

export function requestAuditMeta(req: Request): RequestAuditMeta {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    req.headers.get("x-real-ip") ||
    null;
  const user_agent = req.headers.get("user-agent");
  return {
    ip: ip ? ip.slice(0, 120) : null,
    user_agent: user_agent ? user_agent.slice(0, 500) : null,
  };
}
