import type { DigitalPlatform } from "./types";

export const DIGITAL_AUTOMATION_STRATEGIES = [
  "manual",
  "browser",
  "api_legacy",
] as const;

export type DigitalAutomationStrategy =
  (typeof DIGITAL_AUTOMATION_STRATEGIES)[number];

export const DIGITAL_CONNECTION_STATUSES = [
  "disconnected",
  "connecting",
  "connected",
  "expired",
  "blocked",
  "challenge_required",
  "error",
] as const;

export type DigitalConnectionStatus =
  (typeof DIGITAL_CONNECTION_STATUSES)[number];

export const DIGITAL_AUTOMATION_STATUSES = [
  "pending",
  "queued",
  "processing",
  "partially_published",
  "published",
  "failed",
  "cancelled",
] as const;

export type DigitalAutomationStatus =
  (typeof DIGITAL_AUTOMATION_STATUSES)[number];

export const DIGITAL_TARGET_PUBLISH_STATUSES = [
  "pending",
  "queued",
  "processing",
  "published",
  "failed",
  "reconnect_required",
  "challenge_required",
  "skipped",
  "cancelled",
] as const;

export type DigitalTargetPublishStatus =
  (typeof DIGITAL_TARGET_PUBLISH_STATUSES)[number];

export type DigitalContentVariants = {
  base?: { caption?: string; hashtags?: string[] };
  instagram?: { caption?: string; hashtags?: string[] };
  facebook?: { caption?: string };
  linkedin?: { caption?: string };
  tiktok?: { caption?: string };
  youtube?: { title?: string; description?: string };
  [key: string]: unknown;
};

export function isDigitalAutomationStrategy(
  v: string
): v is DigitalAutomationStrategy {
  return (DIGITAL_AUTOMATION_STRATEGIES as readonly string[]).includes(v);
}

export function isDigitalAutomationStatus(
  v: string
): v is DigitalAutomationStatus {
  return (DIGITAL_AUTOMATION_STATUSES as readonly string[]).includes(v);
}

export function isDigitalTargetPublishStatus(
  v: string
): v is DigitalTargetPublishStatus {
  return (DIGITAL_TARGET_PUBLISH_STATUSES as readonly string[]).includes(v);
}

export function captionForPlatform(
  variants: DigitalContentVariants | null | undefined,
  platform: DigitalPlatform,
  fallbackBody: string,
  fallbackHashtags?: string | null
): { caption: string; title?: string; description?: string } {
  const v = variants || {};
  if (platform === "youtube") {
    const yt = v.youtube as
      | { title?: string; description?: string }
      | undefined;
    return {
      caption: yt?.description || fallbackBody,
      title: yt?.title || fallbackBody.slice(0, 100),
      description: yt?.description || fallbackBody,
    };
  }
  const keyed = v[platform] as
    | { caption?: string; hashtags?: string[] }
    | undefined;
  const base = v.base as
    | { caption?: string; hashtags?: string[] }
    | undefined;
  const caption =
    keyed?.caption ||
    base?.caption ||
    [fallbackBody, fallbackHashtags].filter(Boolean).join("\n\n");
  return { caption };
}
