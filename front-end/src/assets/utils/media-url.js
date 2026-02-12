/**
 * Convert a backend media URL to a browser-accessible path.
 *
 * The Django API returns absolute URLs like
 *   http://backend:8080/images/Company/company-logo/fenesi.jpg
 *
 * "backend" is a Docker-internal hostname the browser can't resolve.
 * We strip everything up to "/images/" and serve it through the
 * Next.js rewrite at /backend-media/ so the request is proxied
 * server-side to the backend container.
 *
 * If the URL is already relative or falsy, it is returned as-is.
 */
export function toLocalMediaUrl(url) {
  if (!url) return url;

  // Extract the path starting from /images/
  const marker = "/images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  // e.g. "Company/company-logo/fenesi.jpg"
  const relativePath = url.substring(idx + marker.length);
  return `/backend-media/${relativePath}`;
}
