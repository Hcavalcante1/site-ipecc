export const DIGITAL_PLATFORMS = [
  "instagram",
  "facebook",
  "youtube",
  "linkedin",
  "tiktok",
] as const;

export type DigitalPlatform = (typeof DIGITAL_PLATFORMS)[number];

export type DigitalAccountScope = "site" | "projeto";

export type DigitalPostStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "published_manual"
  | "archived";

export type DigitalPostSource =
  | "manual"
  | "agent_noticia"
  | "agent_evento"
  | "agent_projeto";

export type DigitalPostTargetBrief = {
  account_id: string;
  platform: DigitalPlatform;
  label: string;
  href: string;
  ativo: boolean;
  publish_status?: string | null;
  external_post_url?: string | null;
  publish_error?: string | null;
  attempt_count?: number | null;
};

export type DigitalPost = {
  id: string;
  title: string;
  body: string;
  hashtags: string | null;
  media_url: string | null;
  media_id?: string | null;
  source_type: DigitalPostSource;
  source_id: string | null;
  status: DigitalPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  external_post_id?: string | null;
  publish_error?: string | null;
  published_via?: "manual" | "instagram_api" | "browser" | "api_legacy" | null;
  automation_status?: string | null;
  content_variants?: Record<string, unknown> | null;
  dry_run?: boolean | null;
  last_publish_error?: string | null;
  targets?: DigitalPostTargetBrief[];
};

export type DigitalAccount = {
  id: string;
  platform: DigitalPlatform;
  label: string;
  href: string;
  handle: string | null;
  scope: DigitalAccountScope;
  projeto_ref: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  automation_enabled?: boolean;
  automation_strategy?: string;
  connection_status?: string;
  requires_reconnect?: boolean;
  last_connection_error?: string | null;
  last_connected_at?: string | null;
};

export type DigitalDraftInput = {
  title: string;
  body: string;
  hashtags: string;
  media_url?: string | null;
  source_type: Exclude<DigitalPostSource, "manual">;
  source_id: string;
  linkPath: string;
};

export function isDigitalPlatform(v: string): v is DigitalPlatform {
  return (DIGITAL_PLATFORMS as readonly string[]).includes(v);
}

export function isDigitalPostStatus(v: string): v is DigitalPostStatus {
  return (
    v === "draft" ||
    v === "approved" ||
    v === "scheduled" ||
    v === "published_manual" ||
    v === "archived"
  );
}
