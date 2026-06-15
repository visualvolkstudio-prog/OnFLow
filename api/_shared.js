import crypto from "node:crypto";

const COOKIE_NAME = "onflow_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

export function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

export function safeEqual(actual = "", expected = "") {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function sessionSignature(expiresAt) {
  requiredEnv(["SESSION_SECRET"]);
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(String(expiresAt))
    .digest("base64url");
}

function secureCookieAttribute(request) {
  const forwardedProtocol = request?.headers?.["x-forwarded-proto"];
  return forwardedProtocol === "https" || (!forwardedProtocol && process.env.VERCEL)
    ? "; Secure"
    : "";
}

export function createSessionCookie(request) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS;
  const value = `${expiresAt}.${sessionSignature(expiresAt)}`;
  return `${COOKIE_NAME}=${value}; Max-Age=${SESSION_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Strict${secureCookieAttribute(request)}`;
}

export function clearSessionCookie(request) {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secureCookieAttribute(request)}`;
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }));
}

export function isAuthorized(request) {
  try {
    const token = parseCookies(request)[COOKIE_NAME];
    if (!token) return false;
    const [expiresAt, signature] = token.split(".");
    if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
    return safeEqual(signature, sessionSignature(expiresAt));
  } catch {
    return false;
  }
}

export function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const forwardedHost = request.headers["x-forwarded-host"] || request.headers.host;
  const forwardedProto = request.headers["x-forwarded-proto"] || "https";
  return origin === `${forwardedProto}://${forwardedHost}`;
}

export async function supabaseRequest(path, options = {}) {
  requiredEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  return response;
}
