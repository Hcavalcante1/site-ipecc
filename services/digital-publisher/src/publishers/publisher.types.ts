export type PublishInput = {
  postId: string;
  targetId: string | null;
  accountId: string;
  platform: string;
  caption: string;
  title?: string;
  description?: string;
  mediaUrl?: string | null;
  dryRun: boolean;
};

export type PublishResult = {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  rawResponse?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  requiresReconnect?: boolean;
  evidencePath?: string;
};

export interface SocialPublisher {
  publish(input: PublishInput): Promise<PublishResult>;
}
