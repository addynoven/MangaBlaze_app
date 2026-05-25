import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const lang = searchParams.get("lang") || "en"
  const limit = Number(searchParams.get("limit") || "100")
  const offset = Number(searchParams.get("offset") || "0")
  const sourceId = searchParams.get("source") || "mangadex"

  if (!id) {
    return NextResponse.json({ error: "Missing manga id" }, { status: 400 })
  }

  try {
    const source = getSource(sourceId)
    const data = await source.getChapters(id, limit, offset, lang)
    return NextResponse.json({ data, total: data.length, limit, offset })
  } catch (error) {
    console.error("Error fetching manga feed:", error)
    return NextResponse.json(
      { error: "Failed to fetch manga feed" },
      { status: 500 }
    )
  }
}
