import "server-only";
import { Resend } from "resend";

type InvitationEmailInput = {
  to: string;
  inviterName: string;
  invitationUrl: string;
  expiresAt: Date;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendCoupleInvitationEmail({
  to,
  inviterName,
  invitationUrl,
  expiresAt,
}: InvitationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Couple invitation email requires RESEND_API_KEY and EMAIL_FROM.");
  }

  const safeName = escapeHtml(inviterName);
  const expiry = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(expiresAt);
  const safeUrl = escapeHtml(invitationUrl);
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: "You've been invited to connect on Life & Legacy",
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#faf9f6;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:20px">
      <p style="margin:0 0 24px;color:#4338ca;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Life &amp; Legacy</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">You've been invited to build your Life &amp; Legacy space together.</h1>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.6"><strong>${safeName}</strong> invited you to connect.</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7">Life &amp; Legacy is a private space for reflection, goals, growth, memories, and shared relationship experiences. Your personal journal remains private unless you choose to share an entry.</p>
      <p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#4338ca;border-radius:10px;color:#fff;text-decoration:none;font-weight:700">Accept invitation</a></p>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6">This invitation expires ${escapeHtml(expiry)} UTC.</p>
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6">If you were not expecting this invitation, you can ignore this email.</p>
    </div>
  </body>
</html>`,
    text: [
      "Life & Legacy",
      "",
      "You've been invited to build your Life & Legacy space together.",
      `${inviterName} invited you to connect.`,
      "",
      "Life & Legacy is a private space for reflection, goals, growth, memories, and shared relationship experiences. Your personal journal remains private unless you choose to share an entry.",
      "",
      `Accept invitation: ${invitationUrl}`,
      "",
      `This invitation expires ${expiry} UTC.`,
      "If you were not expecting this invitation, you can ignore this email.",
    ].join("\n"),
  });

  if (result.error) {
    throw new Error(`Resend could not deliver the couple invitation: ${result.error.message}`);
  }
}

export function getCoupleInvitationUrl(token: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredOrigin) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured to send couple invitations.");
  }

  let origin: URL;
  try {
    origin = new URL(configuredOrigin);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute application URL.");
  }

  if (
    origin.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS outside local development.");
  }

  return new URL(`/couple/invite/${token}`, origin).toString();
}
