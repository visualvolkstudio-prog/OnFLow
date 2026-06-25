import {
  isAuthorized,
  json,
  readJson,
  sameOrigin,
  supabaseRequest
} from "./_shared.js";

function stateId() {
  return encodeURIComponent(process.env.APP_STATE_ID || "primary");
}

export default async function handler(request, response) {
  if (!["GET", "PUT"].includes(request.method)) return json(response, 405, { error: "Method not allowed" });
  if (!isAuthorized(request)) return json(response, 401, { error: "Unauthorized" });
  if (request.method === "PUT" && !sameOrigin(request)) return json(response, 403, { error: "Origin not allowed" });

  try {
    if (request.method === "GET") {
      const result = await supabaseRequest(`app_state?id=eq.${stateId()}&select=state,updated_at`);
      const rows = await result.json();
      return json(response, 200, {
        state: rows[0]?.state || null,
        updatedAt: rows[0]?.updated_at || null
      });
    }

    const body = await readJson(request);
    if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
      return json(response, 400, { error: "State tidak valid." });
    }
    const updatedAt = new Date().toISOString();
    await supabaseRequest("app_state?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: process.env.APP_STATE_ID || "primary",
        state: body.state,
        updated_at: updatedAt
      })
    });
    return json(response, 200, { saved: true, updatedAt });
  } catch (error) {
    console.error(error);
    return json(response, 502, { error: "Penyimpanan cloud sedang tidak tersedia." });
  }
}
