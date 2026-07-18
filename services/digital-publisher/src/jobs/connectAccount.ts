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
  facebook: "https://www.facebook.com/login.php",
  linkedin: "https://www.linkedin.com/login",
  tiktok: "https://www.tiktok.com/login",
  youtube: "https://accounts.google.com/ServiceLogin?service=youtube",
};

const SESSION_PROBE_URL: Record<string, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  linkedin: "https://www.linkedin.com/feed/",
  tiktok: "https://www.tiktok.com/",
  youtube: "https://www.youtube.com/",
};

/** Monta URL pública a partir do @handle se o href estiver vazio. */
function hrefFromHandle(
  platform: string,
  handle: string | null | undefined
): string | null {
  const h = (handle || "").trim().replace(/^@+/, "");
  if (!h) return null;
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${encodeURIComponent(h)}/`;
    case "facebook":
      return /^\d+$/.test(h)
        ? `https://www.facebook.com/profile.php?id=${h}`
        : `https://www.facebook.com/${encodeURIComponent(h)}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${encodeURIComponent(h)}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
    case "youtube":
      return `https://www.youtube.com/@${encodeURIComponent(h)}`;
    default:
      return null;
  }
}

/**
 * URL do perfil cadastrado (todas as plataformas).
 * Prioridade: href do admin → handle → só então login genérico.
 * Nunca troca um href válido por tela de login.
 */
function resolveProfileUrl(acc: AccountRow): string {
  const href = acc.href?.trim();
  if (href && /^https?:\/\//i.test(href)) {
    return href;
  }

  const fromHandle = hrefFromHandle(acc.platform, acc.handle);
  if (fromHandle) return fromHandle;

  return LOGIN_URL[acc.platform] || "";
}

/** @deprecated use resolveProfileUrl — mantido para verify/session probe */
function resolveStartUrl(acc: AccountRow): string {
  return resolveProfileUrl(acc);
}

async function gotoSafe(page: Page, url: string, label: string) {
  console.log(`[digital-publisher] Navegando (${label}): ${url}`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[digital-publisher] goto demorou/falhou (${label}): ${msg}. Tentando modo commit…`
    );
  }
  await page.goto(url, { waitUntil: "commit", timeout: 30000 });
}

/** Se a Meta redirecionou para login/home, força de volta o perfil cadastrado. */
async function ensureOnRegisteredProfile(page: Page, profileUrl: string) {
  const current = page.url();
  let sameHost = false;
  try {
    sameHost = new URL(current).hostname === new URL(profileUrl).hostname;
  } catch {
    sameHost = false;
  }
  const onLogin =
    /\/accounts\/login|\/login\.php|\/login\/?/i.test(current) ||
    /source=desktop_dynamic_landing/i.test(current);
  const alreadyOnProfile =
    sameHost &&
    !onLogin &&
    (current === profileUrl ||
      current.replace(/\/$/, "") === profileUrl.replace(/\/$/, "") ||
      current.startsWith(profileUrl));

  if (!alreadyOnProfile) {
    await gotoSafe(page, profileUrl, "forcar-perfil-cadastrado");
  }
}

/** Libera contas presas em connecting (ex.: goto travado / worker reiniciado). */
export async function recoverStaleConnecting(
  db: SupabaseClient,
  olderThanMs = 2 * 60 * 1000
) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data } = await db
    .from("digital_accounts")
    .select("id, label, updated_at")
    .eq("connection_status", "connecting")
    .lt("updated_at", cutoff)
    .limit(20);

  for (const row of data || []) {
    await db
      .from("digital_accounts")
      .update({
        connection_status: "error",
        requires_reconnect: true,
        last_connection_error:
          "Conectar ficou preso. Clique Conectar de novo (mantenha a janela aberta).",
        last_connection_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    console.warn(
      `[digital-publisher] Connecting antigo liberado: ${row.label || row.id}`
    );
  }
}

function profileDir(cfg: WorkerConfig, accountId: string) {
  const base =
    process.env.DIGITAL_BROWSER_STORAGE_DIR ||
    path.join(process.cwd(), ".browser-profiles");
  // Perfil separado do Chromium bundlado — evita conflito com Chrome do sistema
  return path.join(base, "chrome", accountId);
}

function clearChromeLocks(profile: string) {
  for (const name of [
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
  ]) {
    try {
      fs.unlinkSync(path.join(profile, name));
    } catch {
      /* ok */
    }
  }
}

async function clearPlatformAuthCookies(
  context: BrowserContext,
  platform: string
) {
  // Só sessão — mantém cookies de dispositivo (datr/mid) para a Meta não tratar como robô novo
  const cookies = await context.cookies();
  const dropNames =
    platform === "facebook"
      ? new Set(["c_user", "xs"])
      : platform === "instagram"
        ? new Set(["sessionid", "ds_user_id"])
        : platform === "linkedin"
          ? new Set(["li_at"])
          : platform === "tiktok"
            ? new Set(["sessionid", "sid_tt"])
            : new Set(["SID", "SSID", "SAPISID"]);

  const toDrop = cookies.filter((c) => dropNames.has(c.name));
  if (!toDrop.length) return;
  const keep = cookies.filter((c) => !dropNames.has(c.name));
  await context.clearCookies();
  if (keep.length) {
    await context.addCookies(keep).catch(() => {});
  }
}

async function launchConnectBrowser(profile: string): Promise<BrowserContext> {
  clearChromeLocks(profile);
  fs.mkdirSync(profile, { recursive: true });

  // Preferir Chrome instalado no Windows (Meta bloqueia Chromium do Playwright)
  const useSystemChrome =
    process.env.DIGITAL_BROWSER_CHANNEL !== "chromium" &&
    (process.env.DIGITAL_BROWSER_CHANNEL === "chrome" ||
      fs.existsSync(
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      ) ||
      fs.existsSync(
        path.join(
          process.env.LOCALAPPDATA || "",
          "Google",
          "Chrome",
          "Application",
          "chrome.exe"
        )
      ));

  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    channel: useSystemChrome ? "chrome" : undefined,
    viewport: { width: 1366, height: 768 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
    args: [
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-session-crashed-bubble",
      "--hide-crash-restore-bubble",
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    timeout: 60000,
  });

  await context.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
  `);

  console.log(
    `[digital-publisher] Navegador: ${useSystemChrome ? "Chrome do sistema" : "Chromium Playwright"}`
  );
  return context;
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
    clearChromeLocks(profile);
    fs.mkdirSync(profile, { recursive: true });
    context = await chromium.launchPersistentContext(profile, {
      headless: process.env.DIGITAL_BROWSER_HEADLESS !== "false",
      viewport: { width: 1280, height: 900 },
      args: ["--disable-dev-shm-usage", "--no-first-run"],
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
  await recoverStaleConnecting(db);

  // Clique mais recente primeiro (senão um Conectar antigo trava o Facebook)
  const { data: accounts, error } = await db
    .from("digital_accounts")
    .select(
      "id, platform, label, href, handle, connection_status, automation_strategy, publisher_config"
    )
    .eq("connection_status", "connecting")
    .eq("automation_strategy", "browser")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !accounts?.length) return false;

  const acc = accounts[0] as AccountRow;
  const publisherConfig =
    (acc.publisher_config as Record<string, unknown>) || {};
  const profileUrl = resolveProfileUrl(acc);
  if (!profileUrl) {
    await markConnectError(
      db,
      acc,
      `Plataforma ${acc.platform} sem URL de perfil cadastrada.`
    );
    return true;
  }

  const profile = profileDir(cfg, acc.id);
  fs.mkdirSync(profile, { recursive: true });

  console.log(
    `[digital-publisher] Conectar INÍCIO ${acc.platform} (${acc.label}) → perfil cadastrado ${profileUrl}`
  );

  await logEvent(db, {
    account_id: acc.id,
    platform: acc.platform,
    event_type: "account_connect_started",
    message: `Abrindo perfil cadastrado de ${acc.label}.`,
    details: { profile, profileUrl, href: acc.href },
  });

  // Touch updated_at para não cair no recover stale durante o login
  await db
    .from("digital_accounts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", acc.id);

  let context: BrowserContext | null = null;
  const timeoutMs = Number(
    process.env.DIGITAL_CONNECT_TIMEOUT_MS || 15 * 60 * 1000
  );
  const keepOpenMs = Number(
    process.env.DIGITAL_CONNECT_KEEP_OPEN_MS || 90 * 1000
  );
  const started = Date.now();

  try {
    context = await launchConnectBrowser(profile);
    const existing = context.pages();
    const page = existing[0] || (await context.newPage());
    for (const extra of existing.slice(1)) {
      await extra.close().catch(() => {});
    }

    await clearPlatformAuthCookies(context, acc.platform);

    // Sempre só o href cadastrado (nunca login.php / accounts/login)
    await gotoSafe(page, profileUrl, "perfil-cadastrado");

    console.log(
      `[digital-publisher] Conectar ${acc.platform} (${acc.label}): aberto=${page.url()} (alvo=${profileUrl}). Faça login se pedir — janela aberta.`
    );

    while (Date.now() - started < timeoutMs) {
      try {
        // Renova updated_at a cada ~30s para o recover stale não matar o login ativo
        if ((Date.now() - started) % 30000 < 2500) {
          await db
            .from("digital_accounts")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", acc.id);
        }

        if (page.isClosed()) {
          await markConnectError(
            db,
            acc,
            "Janela do navegador foi fechada. Clique Conectar de novo e mantenha aberta até concluir o login."
          );
          return true;
        }
        if (await hasAuthCookies(context, acc.platform)) {
          try {
            await ensureOnRegisteredProfile(page, profileUrl);
          } catch {
            /* cookies já bastam */
          }
          await markConnected(db, acc, profile, publisherConfig);
          await logEvent(db, {
            account_id: acc.id,
            platform: acc.platform,
            event_type: "account_connect_success",
            message: "Sessão conectada (cookies confirmados).",
            details: { profile, profileUrl, finalUrl: page.url() },
          });
          console.log(
            `[digital-publisher] Conta ${acc.label} conectada. Mantendo janela aberta ${Math.round(keepOpenMs / 1000)}s.`
          );
          await page.waitForTimeout(keepOpenMs);
          return true;
        }
        await page.waitForTimeout(2000);
      } catch (loopErr) {
        const msg =
          loopErr instanceof Error ? loopErr.message : String(loopErr);
        if (/has been closed|Target closed|browser has been closed/i.test(msg)) {
          await markConnectError(
            db,
            acc,
            "Janela do navegador foi fechada. Clique Conectar de novo e mantenha aberta até concluir o login."
          );
          return true;
        }
        throw loopErr;
      }
    }

    await markConnectError(
      db,
      acc,
      "Tempo esgotado sem login válido (cookie de sessão ausente). Faça login na janela e tente de novo."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[digital-publisher] Conectar ERRO ${acc.platform}:`, message);
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
