import { NextResponse } from "next/server";

/**
 * Debug endpoint to test the proxy functionality
 */
export async function GET(request) {
  try {
    // Get the URL to proxy from the 'url' query parameter
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url") || "https://example.com";

    // Log the request details
    console.log("Debug proxy request:", {
      url,
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Make the request
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    // Log the response details
    console.log("Debug proxy response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Return the response details as JSON for debugging
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: url,
      proxied: true,
    });
  } catch (error) {
    console.error("Debug proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
