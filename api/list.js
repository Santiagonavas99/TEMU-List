// Vercel API route: same-origin proxy to the public Supabase Edge Function.
// The URL identifies a function; it is not a service-role credential.
const TARGET = "https://agvejxvvjhgoobfvorcq.supabase.co/functions/v1/temu-family-wishlist-v1";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetch(TARGET, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body || {}) : undefined,
      signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({ error: "Servicio no disponible" }));
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: "No pudimos conectar con las listas familiares" });
  } finally {
    clearTimeout(timeout);
  }
}
