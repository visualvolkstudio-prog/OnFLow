import { clearSessionCookie, json, sameOrigin } from "./_shared.js";

export default function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  if (!sameOrigin(request)) return json(response, 403, { error: "Origin not allowed" });
  response.setHeader("Set-Cookie", clearSessionCookie(request));
  return json(response, 200, { authenticated: false });
}
