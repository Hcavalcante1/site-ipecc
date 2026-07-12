import http from "http";
import { loadConfig } from "./config";
import { createDb } from "./database";
import { runPollCycle } from "./worker";

async function main() {
  const cfg = loadConfig();
  const db = createDb(cfg);

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "digital-publisher",
        workerId: cfg.workerId,
        dryRun: cfg.dryRun,
      })
    );
  });
  server.listen(cfg.port, () => {
    console.log(
      `[digital-publisher] health :${cfg.port} dryRun=${cfg.dryRun} id=${cfg.workerId}`
    );
  });

  console.log(
    "[digital-publisher] Escopo: só publica o que o admin aprovou/agendou. Sem decisão editorial."
  );

  for (;;) {
    try {
      const worked = await runPollCycle(db, cfg);
      if (!worked) await sleep(cfg.pollMs);
      else await sleep(500);
    } catch (err) {
      console.error("[digital-publisher] ciclo erro:", err);
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
