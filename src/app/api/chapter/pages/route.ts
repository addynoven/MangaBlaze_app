import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const sourceId = searchParams.get("source") || "mangadex"

  if (!id) {
    return NextResponse.json({ error: "Missing chapter id" }, { status: 400 })
  }

  try {
    const source = getSource(sourceId)
    const data = await source.getChapterPages(id)
    return NextResponse.json({
      baseUrl: "",
      hash: "",
      data: data.map((p) => p.url),
      dataSaver: [],
      pages: data,
    })
  } catch (error) {
    console.error("Error fetching chapter pages:", error)
    return NextResponse.json(
      { error: "Failed to fetch chapter pages" },
      { status: 500 }
    )
  }
}
