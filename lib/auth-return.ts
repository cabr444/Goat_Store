// Only storefront paths can be used after authentication; never accept an external redirect.
export function safeStoreReturn(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const parsed = new URL(value, 'https://goat.invalid');
    if (parsed.origin !== 'https://goat.invalid' || !['/', '/catalogo', '/store', '/segunda', '/cursos'].includes(parsed.pathname)) return '/';
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return '/'; }
}
