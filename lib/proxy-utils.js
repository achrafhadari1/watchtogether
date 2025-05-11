/**
 * Utility function to proxy a URL through the server-side proxy
 * @param {string} url - The original URL to proxy
 * @returns {string} The proxied URL
 */
export function getProxiedUrl(url) {
  if (!url) return null;

  // Don't proxy local URLs or already proxied URLs
  if (
    !url ||
    url.startsWith("/api/proxy") ||
    url.startsWith("/") ||
    (typeof window !== "undefined" && url.startsWith(window.location.origin))
  ) {
    return url;
  }

  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Utility function to handle HLS.js XHR setup for proxying
 * @param {XMLHttpRequest} xhr - The XHR object
 * @param {string} url - The URL being requested
 */
export function proxyHlsRequest(xhr, url) {
  // If the URL is not already proxied and is an absolute URL, proxy it
  if (!url.startsWith("/api/proxy") && url.includes("://")) {
    const proxiedUrl = getProxiedUrl(url);
    xhr.open("GET", proxiedUrl, true);
  }
}
