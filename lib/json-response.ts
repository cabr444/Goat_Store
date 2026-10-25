// Proxies and failed server functions can return an empty body or HTML.
// Never treat those responses as a successful login or expose their raw contents.
export async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const fallback = response.status === 429 ? 'Demasiados intentos. Inténtalo más tarde.' : 'El servidor no respondió correctamente. Vuelve a intentarlo en unos momentos.';
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw Error(fallback); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(fallback);
  const result = data as Record<string, any>;
  if (!response.ok) throw Error(typeof result.error === 'string' && result.error ? result.error : fallback);
  return result;
}
