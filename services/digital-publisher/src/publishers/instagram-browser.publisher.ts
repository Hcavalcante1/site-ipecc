import { chromium, type BrowserContext } from "playwright";
import fs from "fs";
import path from "path";
import type { PublishInput, PublishResult, SocialPublisher } from "./publisher.types";

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
      try {
        context = await chromium.launchPersistentContext(profile, {
          headless: opts.headless,
          viewport: { width: 1280, height: 900 },
        });
        const page = context.pages()[0] || (await context.newPage());
        await page.goto("https://www.instagram.com/", {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        // Sessão inválida → pedir reconexão (não contornar login/2FA)
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

        // Fluxo mínimo: abrir criação de post (seletores frágeis — evoluir com evidências)
        const newPost = page.getByRole("link", { name: /new post|nova publicação|create/i }).first();
        if ((await newPost.count()) === 0) {
          return {
            success: false,
            errorCode: "ui_changed",
            errorMessage:
              "Não encontrou o botão de nova publicação. Interface pode ter mudado.",
            requiresReconnect: false,
          };
        }

        // Nesta fase: validação de sessão OK; upload real será completado com mídia local
        return {
          success: false,
          errorCode: "partial_implementation",
          errorMessage:
            "Sessão Instagram válida detectada; upload automático de mídia ainda em implementação. Use dry-run ou legado temporariamente.",
          rawResponse: { session_ok: true },
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
      }
    },
  };
}
