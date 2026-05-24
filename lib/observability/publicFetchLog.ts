type PublicFetchLog = {
  page: string;
  table: string;
  count?: number;
  error?: string;
};

/** Log leve de leituras públicas (dev ou PUBLIC_FETCH_LOG=1). */
export function logPublicFetch(payload: PublicFetchLog) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.PUBLIC_FETCH_LOG !== "1"
  ) {
    return;
  }

  console.info(
    "[public-fetch]",
    JSON.stringify({ ...payload, ts: new Date().toISOString() })
  );
}
