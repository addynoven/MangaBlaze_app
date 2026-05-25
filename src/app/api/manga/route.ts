import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const limit = Number(searchParams.get("limit") || "20")
  const sourcesParam = searchParams.get("source") || "mangadex"
  
  const sourceIds = sourcesParam.split(",").filter(Boolean).slice(0, 10)

  try {
    const results = await Promise.allSettled(
      sourceIds.map(async (id) => {
        const source = getSource(id)
        const data = await source.search(query, limit)
        return (data || []).map(m => ({ ...m, source: id }))
      })
    )

    const allResults = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)

    // Deduplicate by title (normalized)
    const uniqueMap = new Map<string, any>()
    
    allResults.forEach(manga => {
      const normalizedTitle = manga.title.toLowerCase().trim()
      if (!uniqueMap.has(normalizedTitle)) {
        uniqueMap.set(normalizedTitle, {
          ...manga,
          sources: [manga.source]
        })
      } else {
        const existing = uniqueMap.get(normalizedTitle)
        if (!existing.sources.includes(manga.source)) {
          existing.sources.push(manga.source)
        }
      }
    })

    return NextResponse.json({ data: Array.from(uniqueMap.values()) })
  } catch (error) {
    console.error("Error searching manga:", error)
    return NextResponse.json(
      { error: "Failed to search manga" },
      { status: 500 }
    )
  }
}
