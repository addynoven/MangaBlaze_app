import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") || "20")
  const sourceId = searchParams.get("source") || "mangadex"

  try {
    // For most sources, "latest" is just a search with empty query
    // MangaDex handles this internally via order[latestUploadedChapter]
    const source = getSource(sourceId)
    const data = await source.search("", limit)
    return NextResponse.json({ data, total: data.length, limit, offset: 0 })
  } catch (error) {
    console.error("Error fetching latest manga:", error)
    return NextResponse.json(
      { error: "Failed to fetch latest manga" },
      { status: 500 }
    )
  }
}
