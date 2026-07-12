import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";
import { claimNextJob, recoverExpiredLocks } from "./jobs/claimJob";
import { executePost } from "./jobs/executePost";

export async function runPollCycle(db: SupabaseClient, cfg: WorkerConfig) {
  await recoverExpiredLocks(db, cfg);
  const postId = await claimNextJob(db, cfg);
  if (!postId) return false;
  await executePost(db, cfg, postId);
  return true;
}
