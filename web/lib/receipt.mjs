// Keep only a one-way fingerprint and request ID across a page reload.
export async function requestKey(payload, storage, cache, cryptoApi) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await cryptoApi.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  let old = cache.current;
  if (!old) {
    try { old = JSON.parse(storage?.getItem("photonix.pending") || "null"); } catch {}
  }
  if (old?.fingerprint === fingerprint && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(old.key)) {
    cache.current = old;
    return old.key;
  }
  const current = { fingerprint, key: cryptoApi.randomUUID() };
  cache.current = current;
  try { storage?.setItem("photonix.pending", JSON.stringify(current)); } catch {}
  return current.key;
}

export function clearKey(storage, cache) {
  cache.current = null;
  try { storage?.removeItem("photonix.pending"); } catch {}
}
