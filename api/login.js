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
    requiredEnv(["APP_PASSWORD", "SESSION_SECRET"]);
    const configuredUsername = process.env.APP_USERNAME || "gilfram";
    const { username = "", password = "" } = await readJson(request);
    const normalizedUsername = String(username).toLocaleLowerCase("id-ID");
    const validUsername = safeEqual(normalizedUsername, configuredUsername.toLocaleLowerCase("id-ID"))
      || safeEqual(normalizedUsername, "gilfram");
    const validPassword = safeEqual(password, process.env.APP_PASSWORD);
    if (!validUsername || !validPassword) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      return json(response, 401, { error: "Username atau password belum tepat." });
    }

    response.setHeader("Set-Cookie", createSessionCookie(request));
    return json(response, 200, { authenticated: true, username: "gilfram" });
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Konfigurasi server belum lengkap." });
  }
}
