// public/js/api.js
//
// One tiny helper for talking to the backend. Every page uses this
// instead of calling fetch() directly, so error handling and JSON
// parsing only has to be written once.

async function apiRequest(method, url, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data && data.errors ? data.errors.join(" ") : "Request failed.";
    throw new Error(message);
  }

  return data;
}

const api = {
  get: (url) => apiRequest("GET", url),
  post: (url, body) => apiRequest("POST", url, body),
  put: (url, body) => apiRequest("PUT", url, body),
  del: (url) => apiRequest("DELETE", url),
};
