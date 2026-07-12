import type { PublishInput, PublishResult, SocialPublisher } from "./publisher.types";

/** Simula publicação sem tocar redes reais. */
export const dryRunPublisher: SocialPublisher = {
  async publish(input: PublishInput): Promise<PublishResult> {
    return {
      success: true,
      externalPostId: `dryrun-${input.platform}-${Date.now()}`,
      externalPostUrl: `https://example.invalid/dry-run/${input.postId}/${input.accountId}`,
      rawResponse: { dry_run: true, platform: input.platform },
    };
  },
};
