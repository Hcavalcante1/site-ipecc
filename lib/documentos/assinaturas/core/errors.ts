export class SignatureError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "SignatureError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const SIGNATURE_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  IDENTITY_NOT_VERIFIED: "IDENTITY_NOT_VERIFIED",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",
  CHALLENGE_REPLAY: "CHALLENGE_REPLAY",
  ALREADY_SIGNED: "ALREADY_SIGNED",
  WRONG_LEVEL: "WRONG_LEVEL",
  DOCUMENT_LOCKED: "DOCUMENT_LOCKED",
  INTEGRITY_FAILED: "INTEGRITY_FAILED",
} as const;
