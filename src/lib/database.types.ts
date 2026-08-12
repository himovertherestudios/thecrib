export type RecordingConsent = "allowed" | "denied";
export type PrivateContentAccess = "requested" | "declined";
export type PromotionalPermission = "approved" | "ask_first" | "denied";

export type OrgRole = "admin" | "staff";

export type ShowStatus = "scheduled" | "live" | "completed" | "cancelled";

export type PerformanceStatus =
  | "scheduled"
  | "recorded"
  | "processing"
  | "preview_ready"
  | "ready"
  | "archived";

export type VideoAssetType =
  | "full_set"
  | "private_preview"
  | "social_clip"
  | "clean_clip"
  | "promo_clip";

export type VideoAssetStatus =
  | "waiting_for_upload"
  | "uploading"
  | "preparing"
  | "ready"
  | "errored"
  | "deleted";

export type PlaybackPolicy = "signed" | "public";

// NOTE: these are `type` aliases, not `interface` declarations, on purpose.
// postgrest-js's structural check that binds each table's Row/Insert/Update
// into the client (`Schema extends GenericSchema`) silently fails — and
// every .from(table) call on that table degrades to `never` with no
// compile error at the declaration site — when the Row type traces back to
// a named `interface`. Plain object type aliases don't trip it. This cost
// a lot of debugging; don't change these back to `interface`.

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  role: OrgRole;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type Club = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  address: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type Show = {
  id: string;
  club_id: string;
  title: string;
  show_date: string;
  start_time: string | null;
  status: ShowStatus;
  created_at: string;
  updated_at: string;
};

export type ComedianProfile = {
  id: string;
  user_id: string | null;
  stage_name: string;
  legal_name: string | null;
  email: string;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckIn = {
  id: string;
  show_id: string;
  comedian_profile_id: string;
  stage_name: string;
  legal_name: string | null;
  email: string;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  expected_set_length_seconds: number | null;
  checked_in_at: string;
  created_at: string;
};

export type ConsentRecord = {
  id: string;
  check_in_id: string;
  comedian_profile_id: string;
  show_id: string;
  recording_consent: RecordingConsent;
  private_content_access: PrivateContentAccess;
  promotional_permission: PromotionalPermission;
  consent_version: string;
  consented_at: string;
  created_at: string;
};

export type Performance = {
  id: string;
  show_id: string;
  comedian_profile_id: string;
  check_in_id: string | null;
  scheduled_order: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  set_length_seconds: number | null;
  status: PerformanceStatus;
  created_at: string;
  updated_at: string;
};

export type VideoAsset = {
  id: string;
  performance_id: string;
  asset_type: VideoAssetType;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_upload_id: string | null;
  playback_policy: PlaybackPolicy;
  asset_status: VideoAssetStatus;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckInRateLimit = {
  id: string;
  ip_address: string;
  created_at: string;
};

// Minimal typed schema surface for supabase-js. Hand-maintained to match
// supabase/migrations/*.sql — regenerate with `supabase gen types` once the
// Supabase CLI is wired into this project's tooling. Insert/Update shapes
// are spelled out explicitly (matching the Supabase-generated style)
// rather than derived with Pick/Omit/Partial helpers — deriving them
// generically hit a TS resolution quirk where the derived type silently
// failed the postgrest-js GenericTable structural check and every
// query/insert/update on the client degraded to `never`.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_invites: {
        Row: OrganizationInvite;
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role: OrgRole;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: OrgRole;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      clubs: {
        Row: Club;
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          address?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          address?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shows: {
        Row: Show;
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          show_date: string;
          start_time?: string | null;
          status?: ShowStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          title?: string;
          show_date?: string;
          start_time?: string | null;
          status?: ShowStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comedian_profiles: {
        Row: ComedianProfile;
        Insert: {
          id?: string;
          user_id?: string | null;
          stage_name: string;
          legal_name?: string | null;
          email: string;
          phone?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          stage_name?: string;
          legal_name?: string | null;
          email?: string;
          phone?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      check_ins: {
        Row: CheckIn;
        Insert: {
          id?: string;
          show_id: string;
          comedian_profile_id: string;
          stage_name: string;
          legal_name?: string | null;
          email: string;
          phone?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          expected_set_length_seconds?: number | null;
          checked_in_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          comedian_profile_id?: string;
          stage_name?: string;
          legal_name?: string | null;
          email?: string;
          phone?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          expected_set_length_seconds?: number | null;
          checked_in_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      consent_records: {
        Row: ConsentRecord;
        Insert: {
          id?: string;
          check_in_id: string;
          comedian_profile_id: string;
          show_id: string;
          recording_consent: RecordingConsent;
          private_content_access: PrivateContentAccess;
          promotional_permission: PromotionalPermission;
          consent_version: string;
          consented_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          check_in_id?: string;
          comedian_profile_id?: string;
          show_id?: string;
          recording_consent?: RecordingConsent;
          private_content_access?: PrivateContentAccess;
          promotional_permission?: PromotionalPermission;
          consent_version?: string;
          consented_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      performances: {
        Row: Performance;
        Insert: {
          id?: string;
          show_id: string;
          comedian_profile_id: string;
          check_in_id?: string | null;
          scheduled_order?: number | null;
          actual_start_time?: string | null;
          actual_end_time?: string | null;
          set_length_seconds?: number | null;
          status?: PerformanceStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          comedian_profile_id?: string;
          check_in_id?: string | null;
          scheduled_order?: number | null;
          actual_start_time?: string | null;
          actual_end_time?: string | null;
          set_length_seconds?: number | null;
          status?: PerformanceStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      video_assets: {
        Row: VideoAsset;
        Insert: {
          id?: string;
          performance_id: string;
          asset_type?: VideoAssetType;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          playback_policy?: PlaybackPolicy;
          asset_status?: VideoAssetStatus;
          duration_seconds?: number | null;
          aspect_ratio?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          performance_id?: string;
          asset_type?: VideoAssetType;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          playback_policy?: PlaybackPolicy;
          asset_status?: VideoAssetStatus;
          duration_seconds?: number | null;
          aspect_ratio?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      check_in_rate_limits: {
        Row: CheckInRateLimit;
        Insert: {
          id?: string;
          ip_address: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
