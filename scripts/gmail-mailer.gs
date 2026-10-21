/**
 * Life Robo mailer: sends registration confirmations and certificates from the club's Gmail.
 * Free, no domain needed. Gmail allows about 100 emails a day from a normal account.
 *
 * Setup (once, signed in as the club Gmail):
 *   1. Go to https://script.google.com and create a new project. Paste this whole file in.
 *   2. Change SECRET below to a long random string (keep it private).
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as: Me          Who has access: Anyone
 *      Approve the Gmail permission prompt. Copy the web app URL (ends in /exec).
 *   4. In the project folder:
 *        npx wrangler secret put MAIL_SCRIPT_URL      (paste the /exec URL)
 *        npx wrangler secret put MAIL_SCRIPT_SECRET   (paste the same SECRET)
 *   After editing this script, use Deploy > Manage deployments > Edit > New version,
 *   so the URL stays the same.
 */

const SECRET = "change-me-to-a-long-random-string";

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, error: "Bad JSON" });
  }
  if (!req || req.secret !== SECRET) return out({ ok: false, error: "Unauthorized" });

  const emails = Array.isArray(req.emails) ? req.emails.slice(0, 50) : [];
  if (emails.length > MailApp.getRemainingDailyQuota()) {
    return out({ ok: false, error: "Daily Gmail limit reached. Try again tomorrow.", quota: MailApp.getRemainingDailyQuota() });
  }

  const results = emails.map(function (m) {
    try {
      const opts = { to: m.to, subject: m.subject, body: m.text, htmlBody: m.html, name: req.fromName || "Life Robo" };
      if (req.replyTo) opts.replyTo = req.replyTo;
      MailApp.sendEmail(opts);
      return null;
    } catch (err) {
      return String(err && err.message ? err.message : err);
    }
  });
  return out({ ok: true, results: results, quota: MailApp.getRemainingDailyQuota() });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
