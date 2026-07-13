import { chromium, type BrowserContext, type Page } from "playwright";
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
  publisher_config?: Record<string, unknown> | null;
};

const LOGIN_URL: Record<string, string> = {
  instagram: "https://www.instagram.com/accounts/login/",
  facebook: "https://www.facebook.com/login/",
  linkedin: "https://www.linkedin.com/login",
  tiktok: "https://www.tiktok.com/login",
  youtube: "https://accounts.google.com/",
};

const SESSION_PROBE_URL: Record<string, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  linkedin: "https://www.linkedin.com/feed/",
  tiktok: "https://www.tiktok.com/",
  youtube: "https://www.youtube.com/",
};

const PLATFORM_HOST: Record<string, RegExp> = {
  instagram: /(^|\.)instagram\.com$/i,
  facebook: /(^|\.)facebook\.com$/i,
  linkedin: /(^|\.)linkedin\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  youtube: /(^|\.)(google|youtube)\.com$/i,
};

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
    /* fallback */
  }
  return fallback;
}

function profileDir(cfg: WorkerConfig, accountId: string) {
  const base =
    process.env.DIGITAL_BROWSER_STORAGE_DIR ||
    path.join(process.cwd(), ".browser-profiles");
  return path.join(base, accountId);
}

/** Prova real de sessão: cookies de autenticação (não perfil público). */
async function hasAuthCookies(
  context: BrowserContext,
  platform: string
): Promise<boolean> {
  const cookies = await context.cookies();
  if (platform === "facebook") {
    return cookies.some(
      (c) =>
        c.name === "c_user" &&
        c.value &&
        /facebook\.com$/i.test(c.domain.replace(/^\./, ""))
    );
  }
  if (platform === "instagram") {
    return cookies.some(
      (c) =>
        (c.name === "sessionid" || c.name === "ds_user_id") &&
        c.value &&
        /instagram\.com$/i.test(c.domain.replace(/^\./, ""))
    );
  }
  if (platform === "linkedin") {
    return cookies.some(
      (c) =>
        (c.name === "li_at" || c.name === "JSESSIONID") &&
        c.value &&
        /linkedin\.com$/i.test(c.domain.replace(/^\./, ""))
    );
  }
  if (platform === "tiktok") {
    return cookies.some(
      (c) =>
        (c.name === "sessionid" || c.name === "sid_tt") &&
        c.value &&
        /tiktok\.com$/i.test(c.domain.replace(/^\./, ""))
    );
  }
  if (platform === "youtube") {
    return cookies.some(
      (c) =>
        (c.name === "SID" || c.name === "SSID" || c.name === "SAPISID") &&
        /google\.com$/i.test(c.domain.replace(/^\./, ""))
    );
  }
  return false;
}

async function uiLooksLoggedIn(platform: string, page: Page): Promise<boolean> {
  const url = page.url();

  if (platform === "instagram") {
    if (url.includes("/accounts/login")) return false;
    const loginBtn = await page
      .getByRole("button", { name: /log in|entrar/i })
      .count();
    return loginBtn === 0 && !url.includes("/challenge/");
  }

  if (platform === "facebook") {
    if (/\/login|login\.php/i.test(url)) return false;
    const emailField = await page
      .locator('input[name="email"], input#email')
      .count();
    const passField = await page
      .locator('input[name="pass"], input[type="password"]')
      .count();
    if (emailField > 0 && passField > 0) return false;
    const accountUi = await page
      .locator(
        '[aria-label*="Conta"], [aria-label*="Account"], [aria-label*="Seu perfil"], [aria-label*="Your profile"]'
      )
      .count();
    return accountUi > 0;
  }

  if (platform === "linkedin") {
    return (
      url.includes("linkedin.com/feed") ||
      (await page.locator('[data-control-name="nav.settings"]').count()) > 0
    );
  }

  if (platform === "tiktok") {
    if (url.includes("/login")) return false;
    return (await page.getByRole("button", { name: /log in|entrar/i }).count()) === 0;
  }

  return !url.includes("accounts.google.com/signin");
}

async function sessionIsAuthenticated(
  context: BrowserContext,
  page: Page,
  platform: string
): Promise<boolean> {
  const cookiesOk = await hasAuthCookies(context, platform);
  if (!cookiesOk) return false;
  return uiLooksLoggedIn(platform, page);
}

async function markConnected(
  db: SupabaseClient,
  acc: AccountRow,
  profile: string,
  publisherConfig: Record<string, unknown>
) {
  const nextConfig = { ...publisherConfig };
  delete nextConfig.verify_pending;

  await db
    .from("digital_accounts")
    .update({
      connection_status: "connected",
      requires_reconnect: false,
      last_connected_at: new Date().toISOString(),
      last_connection_check_at: new Date().toISOString(),
      last_connection_error: null,
      session_reference: profile,
      browser_profile_reference: profile,
      publisher_config: nextConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", acc.id);
}

async function markExpired(
  db: SupabaseClient,
  acc: AccountRow,
  message: string,
  publisherConfig: Record<string, unknown>
) {
  const nextConfig = { ...publisherConfig };
  delete nextConfig.verify_pending;

  await db
    .from("digital_accounts")
    .update({
      connection_status: "expired",
      requires_reconnect: true,
      last_connection_error: message,
      last_connection_check_at: new Date().toISOString(),
      publisher_config: nextConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", acc.id);
}

/** Verifica sessão existente (cookies) sem exigir novo login. */
export async function processVerifyRequests(
  db: SupabaseClient,
  cfg: WorkerConfig
): Promise<boolean> {
  const { data: accounts, error } = await db
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, publisher_config, automation_strategy"
    )
    .eq("automation_strategy", "browser")
    .contains("publisher_config", { verify_pending: true })
    .order("updated_at", { ascending: true })
    .limit(1);

  if (error || !accounts?.length) return false;

  const acc = accounts[0] as AccountRow;
  const publisherConfig =
    (acc.publisher_config as Record<string, unknown>) || {};
  const profile = profileDir(cfg, acc.id);
  const probe =
    SESSION_PROBE_URL[acc.platform] || resolveStartUrl(acc) || LOGIN_URL[acc.platform];

  await logEvent(db, {
    account_id: acc.id,
    platform: acc.platform,
    event_type: "account_verify_started",
    message: `Verificando sessão de ${acc.label}.`,
    details: { probe },
  });

  let context: BrowserContext | null = null;
  try {
    fs.mkdirSync(profile, { recursive: true });
    context = await chromium.launchPersistentContext(profile, {
      headless: process.env.DIGITAL_BROWSER_HEADLESS !== "false",
      viewport: { width: 1280, height: 900 },
    });
    const page = context.pages()[0] || (await context.newPage());
    await page.goto(probe, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);

    const ok = await sessionIsAuthenticated(context, page, acc.platform);
    if (ok) {
      await markConnected(db, acc, profile, publisherConfig);
      await logEvent(db, {
        account_id: acc.id,
        platform: acc.platform,
        event_type: "account_verify_success",
        message: "Sessão válida confirmada (cookies + UI).",
      });
      console.log(`[digital-publisher] Verificar ${acc.label}: sessão OK.`);
    } else {
      await markExpired(
        db,
        acc,
        "Sessão inválida ou inexistente. Use Conectar (browser) e faça login.",
        publisherConfig
      );
      await logEvent(db, {
        account_id: acc.id,
        platform: acc.platform,
        event_type: "account_verify_failed",
        severity: "warn",
        message: "Sessão inválida na verificação.",
      });
      console.log(`[digital-publisher] Verificar ${acc.label}: sessão inválida.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markExpired(db, acc, message, publisherConfig);
    await logEvent(db, {
      account_id: acc.id,
      platform: acc.platform,
      event_type: "account_verify_failed",
      severity: "error",
      message,
    });
  } finally {
    try {
      await context?.close();
    } catch {}
  }

  return true;
}

/** Abre navegador visível para login manual (sem senha no IPECC). */
export async function processConnectRequests(
  db: SupabaseClient,
  cfg: WorkerConfig
): Promise<boolean> {
  const { data: accounts, error } = await db
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, connection_status, automation_strategy, publisher_config"
    )
    .eq("connection_status", "connecting")
    .eq("automation_strategy", "browser")
    .order("updated_at", { ascending: true })
    .limit(1);

  if (error || !accounts?.length) return false;

  const acc = accounts[0] as AccountRow;
  const publisherConfig =
    (acc.publisher_config as Record<string, unknown>) || {};
  const loginUrl = LOGIN_URL[acc.platform];
  const probe = SESSION_PROBE_URL[acc.platform] || loginUrl;
  if (!loginUrl) {
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
    message: `Abrindo login de ${acc.label}.`,
    details: { profile, loginUrl, probe },
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
    // Conectar = sempre tela de login (perfil público não prova sessão)
    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log(
      `[digital-publisher] Conectar ${acc.platform} (${acc.label}): ${loginUrl}. Faça login; só conecta com cookie de sessão.`
    );

    while (Date.now() - started < timeoutMs) {
      // Após login, prova no feed/home (não no perfil público)
      if (!/\/login|login\.php|accounts\/login/i.test(page.url())) {
        await page
          .goto(probe, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          })
          .catch(() => {});
        await page.waitForTimeout(1500);
      }

      if (await sessionIsAuthenticated(context, page, acc.platform)) {
        await markConnected(db, acc, profile, publisherConfig);
        await logEvent(db, {
          account_id: acc.id,
          platform: acc.platform,
          event_type: "account_connect_success",
          message: "Sessão conectada (cookies de autenticação confirmados).",
          details: { profile, loginUrl, probe },
        });
        console.log(`[digital-publisher] Conta ${acc.label} conectada.`);
        return true;
      }
      await page.waitForTimeout(3000);
    }

    await markConnectError(
      db,
      acc,
      "Tempo esgotado sem login válido (cookie de sessão ausente). Faça login na janela e tente de novo."
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
