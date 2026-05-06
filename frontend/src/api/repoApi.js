// Relative URL — proxied by Vite to http://localhost:5000 (avoids CORS)
// const BASE_URL = "/api/v1/repo";
const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1/repo";


async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || json.message || "Request failed");
    } catch (parseErr) {
      if (parseErr.message !== "Request failed") throw parseErr;
      throw new Error(text || "Request failed");
    }
  }
  return res.json();
}

export async function loadRepo(repoUrl) {
  // Large repos (e.g. nodejs/node) take a long time on first fetch.
  // Give the backend 110s before we give up on the client side.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110_000);

  try {
    const res = await fetch(`${BASE_URL}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl }),
      signal: controller.signal,
    });
    return handleResponse(res);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        "Request timed out — this is a very large repo. Try again; it will be instant from cache."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// BUG FIX: encodeURIComponent on all query params (especially path, which contains slashes)
export async function getFile(owner, repo, path) {
  const res = await fetch(
    `${BASE_URL}/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
  );

  return handleResponse(res);
}

export async function getFolder(owner, repo, path) {
  const res = await fetch(
    `${BASE_URL}/folder?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
  );

  return handleResponse(res);
}

export async function getFileUsage(file) {
  const res = await fetch(
    `${BASE_URL}/usage?file=${encodeURIComponent(file)}`
  );
  return handleResponse(res);
}

export async function resolveImport(file, importPath) {
  const res = await fetch(
    `${BASE_URL}/resolve-import?file=${encodeURIComponent(file)}&importPath=${encodeURIComponent(importPath)}`
  );
  return handleResponse(res);
}

// Fetches raw file content directly from GitHub (no AI, no backend)
export async function fetchRawFile(owner, repo, commitSha, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch file: ${path}`);
  return res.text();
}