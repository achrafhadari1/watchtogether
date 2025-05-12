import { NextResponse } from "next/server";

/**
 * Reconstruct a proxied URL
 */
function getProxiedUrl(url) {
  if (!url) return null;
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    console.error("Missing URL parameter");
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    console.log("Proxying request to:", decodedUrl);

    try {
      new URL(decodedUrl);
    } catch (urlError) {
      console.error("Invalid URL format:", urlError);
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const headers = new Headers();

    // Set common headers
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    headers.set("Accept", "*/*");
    headers.set("Accept-Language", "en-US,en;q=0.9");
    headers.set("Accept-Encoding", "gzip, deflate, br");
    headers.set("Connection", "keep-alive");
    headers.set("Cache-Control", "no-cache");
    headers.set("Pragma", "no-cache");

    // Set streaming-specific headers
    if (request.headers.get("x-stream-type") === "hls") {
      headers.set("Origin", "https://www.cineby.app");
      headers.set("Referer", "https://www.cineby.app/");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(decodedUrl, {
      headers,
      signal: controller.signal,
      credentials: "omit",
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      console.error(
        `Target URL responded with: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        {
          error: `Target server responded with: ${response.status} ${response.statusText}`,
          url: decodedUrl,
        },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    const isM3U8 =
      contentType?.includes("application/vnd.apple.mpegurl") ||
      contentType?.includes("application/x-mpegurl") ||
      contentType?.includes("audio/x-mpegurl") ||
      decodedUrl.endsWith(".m3u8");

    let body;

    if (isM3U8) {
      const text = await response.text();
      const baseUrl = new URL(decodedUrl);
      const baseDir = baseUrl.href.substring(
        0,
        baseUrl.href.lastIndexOf("/") + 1
      );

      // Process M3U8 content
      const rewritten = text.replace(/^(?!#)(.+)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith("#")) return line;

        try {
          // Handle different URL formats
          let absoluteUrl;
          if (line.startsWith("http://") || line.startsWith("https://")) {
            absoluteUrl = line;
          } else if (line.startsWith("//")) {
            absoluteUrl = baseUrl.protocol + line;
          } else if (line.startsWith("/")) {
            absoluteUrl = `${baseUrl.protocol}//${baseUrl.host}${line}`;
          } else {
            absoluteUrl = new URL(line, baseDir).href;
          }
          return getProxiedUrl(absoluteUrl);
        } catch (e) {
          console.warn("Failed to process M3U8 line:", line, e);
          return line;
        }
      });

      body = new TextEncoder().encode(rewritten);
    } else {
      body = await response.arrayBuffer();
    }

    // Set response headers
    const responseHeaders = {
      "Content-Type": contentType || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": [
        "Content-Type",
        "Authorization",
        "Origin",
        "Referer",
        "X-Stream-Type",
        "X-Original-Url",
      ].join(", "),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Origin",
    };

    // Forward relevant headers
    const forwardHeaders = [
      "content-length",
      "content-encoding",
      "date",
      "last-modified",
      "etag",
    ];

    forwardHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) responseHeaders[header] = value;
    });

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out:", error);
      return NextResponse.json(
        { error: "Request timed out", url },
        { status: 504 }
      );
    }

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.error("Network error:", error);
      return NextResponse.json(
        { error: "Network error - Unable to reach target server", url },
        { status: 502 }
      );
    }

    console.error("Unexpected proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message, url },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": [
        "Content-Type",
        "Authorization",
        "Origin",
        "Referer",
        "X-Stream-Type",
        "X-Original-Url",
      ].join(", "),
      Vary: "Origin",
    },
  });
}
