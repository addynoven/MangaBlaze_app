import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const sourceId = searchParams.get("source") || "mangadex"

  if (query.length < 2) {
    return NextResponse.json({ data: [] })
  }

  try {
    const source = getSource(sourceId)
    // Most search methods return plenty of data, we just take the top 5 for suggestions
    const data = await source.search(query, 5)
    
    return NextResponse.json({ 
      data: (data || []).map(m => ({
        id: m.id,
        title: m.title,
        cover: m.cover,
        source: sourceId
      }))
    })
  } catch (error) {
    return NextResponse.json({ data: [] })
  }
}
