import { dryRunPublisher } from "./dryRun.publisher";
import type { SocialPublisher } from "./publisher.types";

/**
 * Factory de publicadores.
 * browser/* será implementado por rede; api_legacy isolado.
 * Por enquanto: dry-run sempre que DIGITAL_PUBLISH_DRY_RUN=true.
 */
export function getPublisher(opts: {
  dryRun: boolean;
  strategy: string;
  platform: string;
}): SocialPublisher {
  if (opts.dryRun || process.env.DIGITAL_PUBLISH_DRY_RUN === "true") {
    return dryRunPublisher;
  }
  // Placeholders: ainda não publicam de verdade
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
            "api_legacy Instagram deve usar a rota Next legada ou adapter futuro.",
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
