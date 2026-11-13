// Contact form handler for openchairadvisory.com
// Route: openchairadvisory.com/api/contact (POST, JSON)
//
// Bindings and variables (set in the Cloudflare dashboard, never in this file):
//   SEND_EMAIL        send_email binding, destination = the verified inbox
//   DEST_EMAIL        verified destination address (plain text variable)
//   FROM_EMAIL        sender on the site's domain, e.g. contact@openchairadvisory.com
//   TURNSTILE_SECRET  Turnstile secret key (secret)

import { EmailMessage } from "cloudflare:email";

const AREAS = new Set(["Implementation", "Ops", "GTM"]);
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Strip anything that could break out of a mail header.
const headerSafe = (s) => String(s).replace(/[\r\n]+/g, " ").trim();

async function verifyTurnstile(token, ip, secret) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token || "");
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = await r.json();
  return out.success === true;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);

    const origin = request.headers.get("origin") || "";
    if (origin && !/^https:\/\/(www\.)?openchairadvisory\.com$/.test(origin)) {
      return json({ ok: false, error: "origin" }, 403);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }

    // Honeypot: real people never fill this field. Pretend success so bots move on.
    if (data.website) return json({ ok: true });

    const email = headerSafe(data.email || "");
    const message = String(data.message || "").trim();
    const areas = Array.isArray(data.areas) ? data.areas.filter((a) => AREAS.has(a)) : [];

    if (!EMAIL_RE.test(email) || email.length > 200) return json({ ok: false, error: "email" }, 400);
    if (message.length < 5 || message.length > 5000) return json({ ok: false, error: "message" }, 400);

    const ip = request.headers.get("cf-connecting-ip");
    if (!(await verifyTurnstile(data.token, ip, env.TURNSTILE_SECRET))) {
      return json({ ok: false, error: "challenge" }, 403);
    }

    const subject = "Open Chair inquiry" + (areas.length ? ` (${areas.join(", ")})` : "") + ` from ${email}`;
    const msgId = `<${crypto.randomUUID()}@openchairadvisory.com>`;
    const body =
      `From: ${email}\n` +
      (areas.length ? `Areas: ${areas.join(", ")}\n` : "") +
      `\n${message}\n\n-- \nSent from the contact form on openchairadvisory.com\n`;

    const raw = [
      `From: Open Chair site <${env.FROM_EMAIL}>`,
      `To: <${env.DEST_EMAIL}>`,
      `Reply-To: <${email}>`,
      `Subject: ${headerSafe(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${msgId}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
    ].join("\r\n");

    try {
      await env.SEND_EMAIL.send(new EmailMessage(env.FROM_EMAIL, env.DEST_EMAIL, raw));
    } catch (err) {
      return json({ ok: false, error: "send" }, 502);
    }
    return json({ ok: true });
  },
};
