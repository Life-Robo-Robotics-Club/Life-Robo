import type { Env } from "./env";

// Email goes out through a small Google Apps Script web app running on the club's Gmail
// (scripts/gmail-mailer.gs). Free, no domain or card needed. A normal Gmail account can send
// about 100 emails a day this way, so certificates go out in capped batches.

export const BATCH_MAX = 50;

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const mailConfigured = (env: Env) => !!(env.MAIL_SCRIPT_URL && env.MAIL_SCRIPT_SECRET);

export interface BatchResult {
  /** Whole request failed (script unreachable, bad secret, quota). */
  error: string | null;
  /** Per-email error, same order as the input; null means sent. */
  results: (string | null)[];
  /** Emails Gmail will still send today, if the script reported it. */
  quota?: number;
}

/** Sends up to BATCH_MAX emails in one call to the Apps Script. */
export async function sendBatch(env: Env, mails: Mail[]): Promise<BatchResult> {
  const list = mails.slice(0, BATCH_MAX);
  const fail = (error: string): BatchResult => ({ error, results: list.map(() => error) });
  if (!list.length) return { error: null, results: [] };
  if (!mailConfigured(env)) return fail("Email is not set up (MAIL_SCRIPT_URL / MAIL_SCRIPT_SECRET missing)");
  let res: Response;
  try {
    // Apps Script answers POST with a redirect to the output; fetch follows it.
    res = await fetch(env.MAIL_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret: env.MAIL_SCRIPT_SECRET,
        fromName: env.MAIL_FROM_NAME || "Life Robo",
        replyTo: env.MAIL_REPLY_TO || "",
        emails: list,
      }),
      redirect: "follow",
    });
  } catch (err) {
    return fail(`Could not reach the mail script: ${String(err)}`);
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; results?: (string | null)[]; quota?: number } | null;
  if (!res.ok || !data) return fail(`Mail script returned ${res.status}. Check the deployment is set to "Anyone".`);
  if (!data.ok) return fail(data.error || "Mail script rejected the request");
  const results = list.map((_, i) => data.results?.[i] ?? null);
  return { error: null, results, quota: data.quota };
}

export async function sendMail(env: Env, m: Mail): Promise<string | null> {
  const r = await sendBatch(env, [m]);
  return r.error ?? r.results[0] ?? null;
}

/** Remaining daily Gmail quota as reported by the script, or null if unknown. */
export async function mailQuota(env: Env): Promise<number | null> {
  if (!mailConfigured(env)) return null;
  try {
    const res = await fetch(env.MAIL_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: env.MAIL_SCRIPT_SECRET, emails: [] }),
      redirect: "follow",
    });
    const data = (await res.json().catch(() => null)) as { quota?: number } | null;
    return typeof data?.quota === "number" ? data.quota : null;
  } catch {
    return null;
  }
}

/* ---------- Templates ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

const tz = "Asia/Kolkata";
export const mailDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(new Date(iso));
const mailTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(new Date(iso)).toUpperCase();

const SIGN_OFF = "Life Robo Robotics Club<br>Faculty of Engineering and Technology, University of Lucknow";
const SIGN_OFF_TEXT = "Life Robo Robotics Club\nFaculty of Engineering and Technology, University of Lucknow";

function layout(origin: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b0b0f;padding:20px 28px"><img src="${origin}/brand/logo-hd.jpg" width="44" height="44" alt="Life Robo" style="border-radius:50%;vertical-align:middle"> <span style="color:#fff;font-size:17px;font-weight:600;vertical-align:middle;margin-left:10px">Life Robo</span></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.55">${inner}<p style="margin:28px 0 0;color:#6e6e73;font-size:14px">${SIGN_OFF}</p></td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${esc(label)}</a></p>`;

interface EventInfo {
  title: string;
  slug: string;
  startsAt: string;
  venue: string;
}

export function confirmationMail(origin: string, to: string, name: string, ev: EventInfo): Mail {
  const when = `${mailDate(ev.startsAt)}, ${mailTime(ev.startsAt)} IST`;
  const link = `${origin}/events/${ev.slug}`;
  const html = layout(
    origin,
    `<p style="margin:0 0 16px">Hi ${esc(firstName(name))},</p>
<p style="margin:0 0 16px">Your spot for <strong>${esc(ev.title)}</strong> is confirmed.</p>
<p style="margin:0 0 6px"><strong>When:</strong> ${esc(when)}</p>
${ev.venue ? `<p style="margin:0 0 16px"><strong>Where:</strong> ${esc(ev.venue)}</p>` : ""}
<p style="margin:16px 0">We take attendance at the venue. Everyone marked present gets a certificate by email after the session.</p>
${button(link, "View event details")}`,
  );
  const text = `Hi ${firstName(name)},

Your spot for ${ev.title} is confirmed.

When: ${when}${ev.venue ? `\nWhere: ${ev.venue}` : ""}

We take attendance at the venue. Everyone marked present gets a certificate by email after the session.

Event details: ${link}

${SIGN_OFF_TEXT}`;
  return { to, subject: `You're registered: ${ev.title}`, html, text };
}

export function certificateMail(origin: string, to: string, name: string, code: string, ev: EventInfo): Mail {
  const link = `${origin}/certificates/${code}`;
  const html = layout(
    origin,
    `<p style="margin:0 0 16px">Hi ${esc(firstName(name))},</p>
<p style="margin:0 0 16px">Thank you for attending <strong>${esc(ev.title)}</strong> on ${esc(mailDate(ev.startsAt))}. Your certificate of participation is ready.</p>
${button(link, "View your certificate")}
<p style="margin:0 0 6px;color:#6e6e73;font-size:14px">Open the link and choose Download PDF to keep a copy. Anyone can check it with the certificate ID <strong>${esc(code)}</strong>.</p>`,
  );
  const text = `Hi ${firstName(name)},

Thank you for attending ${ev.title} on ${mailDate(ev.startsAt)}. Your certificate of participation is ready:

${link}

Open the link and choose Download PDF to keep a copy. Certificate ID: ${code}

${SIGN_OFF_TEXT}`;
  return { to, subject: `Your certificate: ${ev.title}`, html, text };
}
