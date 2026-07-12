import { dryRunPublisher } from "./dryRun.publisher";
import { createInstagramBrowserPublisher } from "./instagram-browser.publisher";
import type { SocialPublisher } from "./publisher.types";
import path from "path";

/**
 * Factory de publicadores.
 * browser Instagram em implementação; demais redes ainda placeholder.
 * DRY_RUN força simulação.
 */
export function getPublisher(opts: {
  dryRun: boolean;
  strategy: string;
  platform: string;
  accountId?: string;
}): SocialPublisher {
  if (opts.dryRun || process.env.DIGITAL_PUBLISH_DRY_RUN === "true") {
    return dryRunPublisher;
  }

  if (opts.strategy === "browser" && opts.platform === "instagram") {
    return createInstagramBrowserPublisher({
      profileDir:
        process.env.DIGITAL_BROWSER_STORAGE_DIR ||
        path.join(process.cwd(), ".browser-profiles"),
      headless: process.env.DIGITAL_BROWSER_HEADLESS !== "false",
    });
  }

  if (opts.strategy === "browser") {
    return {
      async publish() {
        return {
          success: false,
          errorCode: "browser_not_implemented",
          errorMessage: `Publicador browser para ${opts.platform} ainda não implementado.`,
        };
      },
    };
  }
  if (opts.strategy === "api_legacy") {
    return {
      async publish() {
        return {
          success: false,
          errorCode: "api_legacy_use_next_route",
          errorMessage:
            "api_legacy Instagram: use a rota Next legada ou adapter futuro.",
        };
      },
    };
  }
  return {
    async publish() {
      return {
        success: false,
        errorCode: "manual_strategy",
        errorMessage: "Conta em estratégia manual — não publicada pelo worker.",
      };
    },
  };
}
