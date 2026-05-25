import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing url", { status: 400 })
  }

  try {
    const targetUrl = new URL(url);
    
    // Determine the best referer based on the host
    let referer = targetUrl.origin;
    if (targetUrl.hostname.includes('mangadex')) {
      referer = 'https://mangadex.org/';
    } else if (targetUrl.hostname.includes('asurascans')) {
      referer = 'https://asurascans.com/';
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": referer,
        "Origin": referer
      }
    })

    if (!response.ok) {
      // Log failure to console for debugging
      console.error(`[Proxy] Failed to fetch ${url}: ${response.status}`);
      return new NextResponse(`Proxy fetch failed: ${response.status}`, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    })
  } catch (error: any) {
    console.error(`[Proxy] Error processing ${url}:`, error.message);
    return new NextResponse("Failed to proxy image", { status: 500 })
  }
}
