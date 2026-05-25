export function logWhatsApp(
  event: string,
  payload: Record<string, unknown> = {}
) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.WHATSAPP_LOG !== "1"
  ) {
    return;
  }

  console.info(
    "[whatsapp]",
    JSON.stringify({ event, ...payload, ts: new Date().toISOString() })
  );
}
