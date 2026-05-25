import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const sourceId = searchParams.get("source") || "mangadex"

  if (!id) {
    return NextResponse.json({ error: "Missing manga id" }, { status: 400 })
  }

  try {
    const source = getSource(sourceId)
    const data = await source.getManga(id)
    if (!data) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 })
    }
    return NextResponse.json({ ...data, sourceId })
  } catch (error) {
    console.error("Error fetching manga:", error)
    return NextResponse.json(
      { error: "Failed to fetch manga" },
      { status: 500 }
    )
  }
}
