import { NextResponse } from "next/server"
import { getSource, mangadexSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") || "20")
  const sourceId = searchParams.get("source") || "mangadex"

  try {
    if (sourceId === "mangadex") {
      // MangaDex has a dedicated popular endpoint
      const data = await mangadexSource.search("", limit)
      return NextResponse.json({ data, total: data.length, limit, offset: 0 })
    }

    // Other sources: fall back to generic search (empty query = popular)
    const source = getSource(sourceId)
    const data = await source.search("", limit)
    return NextResponse.json({ data, total: data.length, limit, offset: 0 })
  } catch (error) {
    console.error("Error fetching popular manga:", error)
    return NextResponse.json(
      { error: "Failed to fetch popular manga" },
      { status: 500 }
    )
  }
}
