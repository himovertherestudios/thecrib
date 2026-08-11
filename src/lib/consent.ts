import type {
  PrivateContentAccess,
  PromotionalPermission,
  RecordingConsent,
} from "@/lib/database.types";

/**
 * Bump this whenever the consent language shown on /check-in changes
 * materially. Existing consent_records keep their original version, so
 * this is an audit trail, not a live pointer.
 */
export const CURRENT_CONSENT_VERSION = "v1";

// Recording is no longer an opt-in/opt-out choice — every check-in is
// informed that recording happens, and must acknowledge it to continue.
// Still stores a real recording_consent value ("allowed") rather than
// skipping the field, so there's an audit trail that they were shown this
// notice and proceeded. `denied` remains a valid value in the schema for
// any historical records from before this change.
export const RECORDING_CONSENT_COPY = {
  heading: "Recording Permission",
  description:
    "Your performance will be recorded by the venue or its media partner for private playback, content creation, and services you request.",
  options: [{ value: "allowed" as RecordingConsent, label: "I understand." }],
};

export const PRIVATE_ACCESS_COPY = {
  heading: "Would you like private access to your recorded performance?",
  options: [
    {
      value: "requested" as PrivateContentAccess,
      label: "Yes, send me access when my set is ready.",
    },
    { value: "declined" as PrivateContentAccess, label: "No, I do not need access." },
  ],
};

export const PROMOTIONAL_PERMISSION_COPY = {
  heading:
    "Can the comedy club use clips from your performance on social media or promotional channels?",
  options: [
    {
      value: "approved" as PromotionalPermission,
      label: "Yes — the club may use approved excerpts.",
    },
    {
      value: "ask_first" as PromotionalPermission,
      label: "Ask me first — contact me for approval before anything is posted.",
    },
    {
      value: "denied" as PromotionalPermission,
      label: "No — my performance may not be used for promotional content.",
    },
  ],
  footnote: "Choosing No does not prevent you from privately receiving your own footage.",
};

export const RECORDING_CONSENT_LABEL: Record<RecordingConsent, string> = {
  allowed: "Allowed",
  denied: "Not Allowed",
};

export const PROMOTIONAL_PERMISSION_LABEL: Record<PromotionalPermission, string> = {
  approved: "Approved",
  ask_first: "Ask First",
  denied: "Not Approved",
};

export const PRIVATE_ACCESS_LABEL: Record<PrivateContentAccess, string> = {
  requested: "Requested",
  declined: "Declined",
};
