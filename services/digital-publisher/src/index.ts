import http from "http";
import path from "path";
import { acquireProcessLock, sendHeartbeat } from "./agentHeartbeat";
import { loadConfig } from "./config";
import { createDb } from "./database";
import { runPollCycle } from "./worker";

async function main() {
  const cfg = loadConfig();
  const releaseLock = acquireProcessLock(path.join(__dirname, ".."));
  const db = createDb(cfg);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "digital-publisher",
        workerId: cfg.workerId,
        dryRun: cfg.dryRun,
        resident: true,
      })
    );
  });

  try {
    server.listen(cfg.port, "127.0.0.1", () => {
      console.log(
        `[digital-publisher] health http://127.0.0.1:${cfg.port}/ dryRun=${cfg.dryRun} id=${cfg.workerId}`
      );
    });
  } catch (err) {
    releaseLock();
    throw err;
  }

  console.log(
    "[digital-publisher] Agente residente: consulta a fila sozinho. Sem decisão editorial."
  );

  await sendHeartbeat(db, cfg);

  for (;;) {
    try {
      const worked = await runPollCycle(db, cfg);
      if (!worked) await sleep(cfg.pollMs);
      else await sleep(500);
    } catch (err) {
      console.error("[digital-publisher] ciclo erro:", err);
      await sendHeartbeat(db, cfg, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      await sleep(cfg.pollMs);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
