import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") || "20")
  const sourceId = searchParams.get("source") || "mangadex"

  try {
    const source = getSource(sourceId)
    const data = await source.search("", limit)
    const results = (data || []).map(m => ({ ...m, source: sourceId }))
    return NextResponse.json({ data: results, total: results.length, limit, offset: 0 })
  } catch (error) {
    console.error("Error fetching updated manga:", error)
    return NextResponse.json(
      { error: "Failed to fetch updated manga" },
      { status: 500 }
    )
  }
}
