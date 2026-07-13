import type { SupabaseClient } from "@supabase/supabase-js";
import { sendHeartbeat, setCurrentJobId } from "./agentHeartbeat";
import type { WorkerConfig } from "./config";
import { claimNextJob, recoverExpiredLocks } from "./jobs/claimJob";
import {
  processConnectRequests,
  processVerifyRequests,
} from "./jobs/connectAccount";
import { executePost } from "./jobs/executePost";

export async function runPollCycle(db: SupabaseClient, cfg: WorkerConfig) {
  await sendHeartbeat(db, cfg);

  await recoverExpiredLocks(db, cfg);

  const verified = await processVerifyRequests(db, cfg);
  if (verified) {
    await sendHeartbeat(db, cfg);
    return true;
  }

  const connected = await processConnectRequests(db, cfg);
  if (connected) {
    await sendHeartbeat(db, cfg);
    return true;
  }

  const postId = await claimNextJob(db, cfg);
  if (!postId) return false;

  setCurrentJobId(postId);
  await sendHeartbeat(db, cfg, { status: "busy" });
  try {
    await executePost(db, cfg, postId);
  } finally {
    setCurrentJobId(null);
    await sendHeartbeat(db, cfg);
  }
  return true;
}
