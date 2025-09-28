export function canonicalizeGammaUrl(input: string): string {
  try {
    const u = new URL(input);
    // Lowercase host
    u.hostname = u.hostname.toLowerCase();
    // Strip query and fragment
    u.search = '';
    u.hash = '';
    // Remove trailing slash in pathname (but keep root '/')
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    // If invalid URL, return original for caller to handle validation error
    return input;
  }
}

