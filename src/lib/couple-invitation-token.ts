import { createHash, randomBytes } from "node:crypto";

export const COUPLE_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createCoupleInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCoupleInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedCoupleInvitationToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}
