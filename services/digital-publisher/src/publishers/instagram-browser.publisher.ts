import { chromium, type BrowserContext } from "playwright";
import fs from "fs";
import os from "os";
import path from "path";
import type { PublishInput, PublishResult, SocialPublisher } from "./publisher.types";

async function downloadMediaToTemp(mediaUrl: string): Promise<string> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar mídia (${res.status}).`);
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const ext =
    ct.includes("png")
      ? ".png"
      : ct.includes("webp")
        ? ".webp"
        : ct.includes("mp4")
          ? ".mp4"
          : ct.includes("jpeg") || ct.includes("jpg")
            ? ".jpg"
            : path.extname(new URL(mediaUrl).pathname) || ".jpg";
  const tmp = path.join(
    os.tmpdir(),
    `ig-media-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmp, buf);
  return tmp;
}

/**
 * Publicador Instagram via navegador (feed + imagem + legenda).
 * DRY_RUN / factory ainda preferem dryRun.publisher.
 * Login inicial: Conectar conta (sessão persistente por perfil).
 */
export function createInstagramBrowserPublisher(opts: {
  profileDir: string;
  headless: boolean;
}): SocialPublisher {
  return {
    async publish(input: PublishInput): Promise<PublishResult> {
      if (input.dryRun) {
        return {
          success: true,
          externalPostId: `ig-dry-${Date.now()}`,
          externalPostUrl: `https://example.invalid/ig/${input.postId}`,
          rawResponse: { dry_run: true },
        };
      }

      if (!input.mediaUrl) {
        return {
          success: false,
          errorCode: "media_required",
          errorMessage: "Instagram feed exige imagem.",
        };
      }

      const profile = path.join(opts.profileDir, input.accountId);
      fs.mkdirSync(profile, { recursive: true });

      let context: BrowserContext | null = null;
      let mediaPath: string | null = null;
      try {
        mediaPath = await downloadMediaToTemp(input.mediaUrl);

        context = await chromium.launchPersistentContext(profile, {
          headless: opts.headless,
          viewport: { width: 1280, height: 900 },
        });
        const page = context.pages()[0] || (await context.newPage());
        await page.goto("https://www.instagram.com/", {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        const needsLogin =
          (await page.getByRole("button", { name: /log in|entrar/i }).count()) >
            0 ||
          page.url().includes("/accounts/login");

        if (needsLogin) {
          return {
            success: false,
            errorCode: "session_expired",
            errorMessage: "Sessão Instagram expirada. Reconecte a conta.",
            requiresReconnect: true,
          };
        }

        // Atalho: criação via /create/select (mais estável que caçar ícone)
        await page.goto("https://www.instagram.com/create/select/", {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: "attached", timeout: 30000 });
        await fileInput.setInputFiles(mediaPath);

        // Avançar etapas (seletores frágeis — texto PT/EN)
        for (let i = 0; i < 3; i++) {
          const next = page.getByRole("button", {
            name: /next|avançar|continuar/i,
          });
          if ((await next.count()) === 0) break;
          await next.first().click({ timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(800);
        }

        const captionBox = page
          .locator(
            'div[aria-label*="caption" i], div[aria-label*="legenda" i], textarea, [contenteditable="true"]'
          )
          .first();
        if ((await captionBox.count()) > 0) {
          await captionBox.click({ timeout: 10000 }).catch(() => {});
          await page.keyboard.type(input.caption.slice(0, 2200), {
            delay: 5,
          });
        }

        const share = page.getByRole("button", {
          name: /share|compartilhar|publicar/i,
        });
        if ((await share.count()) === 0) {
          return {
            success: false,
            errorCode: "ui_changed",
            errorMessage:
              "Mídia anexada, mas não encontrou botão Compartilhar. Interface pode ter mudado.",
            rawResponse: { media_attached: true },
          };
        }
        await share.first().click({ timeout: 15000 });

        // Espera curta pós-publicação
        await page.waitForTimeout(4000);
        const evidenceDir = path.join(opts.profileDir, "_evidence");
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidencePath = path.join(
          evidenceDir,
          `ig-${input.postId}-${Date.now()}.png`
        );
        await page.screenshot({ path: evidencePath, fullPage: false });

        return {
          success: true,
          externalPostId: `ig-browser-${Date.now()}`,
          externalPostUrl: page.url(),
          evidencePath,
          rawResponse: { session_ok: true, uploaded: true },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          errorCode: "browser_error",
          errorMessage: message,
        };
      } finally {
        try {
          await context?.close();
        } catch {}
        if (mediaPath) {
          try {
            fs.unlinkSync(mediaPath);
          } catch {}
        }
      }
    },
  };
}
