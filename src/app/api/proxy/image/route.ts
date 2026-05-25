import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing url", { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": new URL(url).origin
      }
    })

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.status}`)
    }

    const blob = await response.blob()
    const contentType = response.headers.get("content-type") || "image/jpeg"

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    })
  } catch (error) {
    console.error("Image proxy error:", error)
    return new NextResponse("Failed to proxy image", { status: 500 })
  }
}
