import { chromium, type BrowserContext } from "playwright";
import fs from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config";
import { logEvent } from "../database";

type AccountRow = {
  id: string;
  platform: string;
  label: string;
  href?: string | null;
  handle?: string | null;
};

const LOGIN_URL: Record<string, string> = {
  instagram: "https://www.instagram.com/accounts/login/",
  facebook: "https://www.facebook.com/login/",
  linkedin: "https://www.linkedin.com/login",
  tiktok: "https://www.tiktok.com/login",
  youtube: "https://accounts.google.com/",
};

const PLATFORM_HOST: Record<string, RegExp> = {
  instagram: /(^|\.)instagram\.com$/i,
  facebook: /(^|\.)facebook\.com$/i,
  linkedin: /(^|\.)linkedin\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  youtube: /(^|\.)google\.com$/i,
};

/** Abre no perfil cadastrado (href); se não logado, a rede redireciona ao login. */
function resolveStartUrl(acc: AccountRow): string {
  const fallback = LOGIN_URL[acc.platform];
  if (!fallback) return "";

  const href = acc.href?.trim();
  if (!href || !/^https?:\/\//i.test(href)) return fallback;

  try {
    const fullHost = new URL(href).hostname;
    const ok = PLATFORM_HOST[acc.platform]?.test(fullHost);
    if (ok) return href;
  } catch {
    /* usa fallback */
  }
  return fallback;
}

function profileDir(cfg: WorkerConfig, accountId: string) {
  const base =
    process.env.DIGITAL_BROWSER_STORAGE_DIR ||
    path.join(process.cwd(), ".browser-profiles");
  return path.join(base, accountId);
}

async function sessionLooksLoggedIn(
  platform: string,
  page: Awaited<ReturnType<BrowserContext["newPage"]>>
): Promise<boolean> {
  const url = page.url();
  if (platform === "instagram") {
    if (url.includes("/accounts/login")) return false;
    const loginBtn = await page
      .getByRole("button", { name: /log in|entrar/i })
      .count();
    return loginBtn === 0 && !url.includes("/challenge/");
  }
  if (platform === "facebook") {
    return !url.includes("/login") && url.includes("facebook.com");
  }
  if (platform === "linkedin") {
    return url.includes("linkedin.com/feed") || url.includes("linkedin.com/in/");
  }
  if (platform === "tiktok") {
    return !url.includes("/login");
  }
  return !url.includes("accounts.google.com/signin");
}

/** Abre navegador visível para login manual (sem senha no IPECC). */
export async function processConnectRequests(
  db: SupabaseClient,
  cfg: WorkerConfig
): Promise<boolean> {
  const { data: accounts, error } = await db
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, connection_status, automation_strategy"
    )
    .eq("connection_status", "connecting")
    .eq("automation_strategy", "browser")
    .order("updated_at", { ascending: true })
    .limit(1);

  if (error || !accounts?.length) return false;

  const acc = accounts[0] as AccountRow;
  const loginUrl = LOGIN_URL[acc.platform];
  const startUrl = resolveStartUrl(acc);
  if (!loginUrl || !startUrl) {
    await markConnectError(
      db,
      acc,
      `Plataforma ${acc.platform} sem URL de login configurada.`
    );
    return true;
  }

  const profile = profileDir(cfg, acc.id);
  fs.mkdirSync(profile, { recursive: true });

  await logEvent(db, {
    account_id: acc.id,
    platform: acc.platform,
    event_type: "account_connect_started",
    message: `Abrindo navegador em ${acc.label}.`,
    details: { profile, startUrl, loginFallback: loginUrl },
  });

  let context: BrowserContext | null = null;
  const timeoutMs = Number(
    process.env.DIGITAL_CONNECT_TIMEOUT_MS || 15 * 60 * 1000
  );
  const started = Date.now();

  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      viewport: { width: 1280, height: 900 },
    });
    const page = context.pages()[0] || (await context.newPage());
    await page.goto(startUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log(
      `[digital-publisher] Conectar ${acc.platform} (${acc.label}): aberto em ${startUrl}. Faça login se a rede pedir.`
    );

    while (Date.now() - started < timeoutMs) {
      if (await sessionLooksLoggedIn(acc.platform, page)) {
        const ref = profile;
        await db
          .from("digital_accounts")
          .update({
            connection_status: "connected",
            requires_reconnect: false,
            last_connected_at: new Date().toISOString(),
            last_connection_check_at: new Date().toISOString(),
            last_connection_error: null,
            session_reference: ref,
            browser_profile_reference: ref,
            updated_at: new Date().toISOString(),
          })
          .eq("id", acc.id);

        await logEvent(db, {
          account_id: acc.id,
          platform: acc.platform,
          event_type: "account_connect_success",
          message: "Sessão conectada com sucesso.",
          details: { profile: ref },
        });
        console.log(`[digital-publisher] Conta ${acc.label} conectada.`);
        return true;
      }
      await page.waitForTimeout(3000);
    }

    await markConnectError(
      db,
      acc,
      "Tempo esgotado aguardando login manual. Tente Conectar (browser) de novo."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markConnectError(db, acc, message);
  } finally {
    try {
      await context?.close();
    } catch {}
  }

  return true;
}

async function markConnectError(
  db: SupabaseClient,
  acc: AccountRow,
  message: string
) {
  await db
    .from("digital_accounts")
    .update({
      connection_status: "error",
      requires_reconnect: true,
      last_connection_error: message,
      last_connection_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", acc.id);

  await logEvent(db, {
    account_id: acc.id,
    platform: acc.platform,
    event_type: "account_connect_failed",
    severity: "error",
    message,
  });
  console.error(`[digital-publisher] Falha ao conectar ${acc.label}:`, message);
}
