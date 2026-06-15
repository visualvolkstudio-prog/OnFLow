import {
  createSessionCookie,
  json,
  readJson,
  requiredEnv,
  safeEqual,
  sameOrigin
} from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  if (!sameOrigin(request)) return json(response, 403, { error: "Origin not allowed" });

  try {
    requiredEnv(["APP_USERNAME", "APP_PASSWORD", "SESSION_SECRET"]);
    const { username = "", password = "" } = await readJson(request);
    const validUsername = safeEqual(String(username).toLocaleLowerCase("id-ID"), process.env.APP_USERNAME.toLocaleLowerCase("id-ID"));
    const validPassword = safeEqual(password, process.env.APP_PASSWORD);
    if (!validUsername || !validPassword) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      return json(response, 401, { error: "Username atau password belum tepat." });
    }

    response.setHeader("Set-Cookie", createSessionCookie(request));
    return json(response, 200, { authenticated: true, username: process.env.APP_USERNAME });
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Konfigurasi server belum lengkap." });
  }
}
