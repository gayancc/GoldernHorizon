"use strict";

const crypto = require("node:crypto");

const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function isLocalRequest(request) {
  const host = (request.get("x-forwarded-host") || request.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function isConfigured(value) {
  return Boolean(value) && !value.startsWith("replace-with-");
}

function getTurnstileSecret(request, config) {
  if (isLocalRequest(request)) {
    return TEST_SECRET_KEY;
  }

  const { secretKey } = config.turnstile;
  if (!isConfigured(secretKey)) {
    throw new Error("Complete functions/security.config.js before accepting bookings.");
  }
  return secretKey;
}

function hasAllowedOrigin(request) {
  const origin = request.get("origin");
  const forwardedHost = (request.get("x-forwarded-host") || request.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!origin || !forwardedHost) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (originHost === forwardedHost) return true;

    const localNames = new Set(["localhost", "127.0.0.1"]);
    return localNames.has(originHost.split(":")[0]) &&
      localNames.has(forwardedHost.split(":")[0]);
  } catch {
    return false;
  }
}

function submissionFingerprint(submission) {
  return crypto
    .createHash("sha256")
    .update(`${submission.email}\n${submission.topic}\n${submission.message.toLowerCase()}`)
    .digest("hex");
}

async function verifyTurnstile({ token, ip, secretKey, fetchImpl = fetch }) {
  if (!token || token.length > 2048) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const verification = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
    });

    if (!verification.ok) return false;
    const result = await verification.json();
    return result.success === true && (!result.action || result.action === "contact");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  TEST_SECRET_KEY,
  getTurnstileSecret,
  hasAllowedOrigin,
  isConfigured,
  isLocalRequest,
  submissionFingerprint,
  verifyTurnstile,
};
