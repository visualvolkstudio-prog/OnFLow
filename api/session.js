import { isAuthorized, json } from "./_shared.js";

export default function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "Method not allowed" });
  return json(response, 200, {
    authenticated: isAuthorized(request),
    username: isAuthorized(request) ? "gilfram" : ""
  });
}
