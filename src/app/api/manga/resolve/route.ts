import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const sourcesParam = searchParams.get("sources")

  if (!title || !sourcesParam) {
    return NextResponse.json({ error: "Missing title or sources" }, { status: 400 })
  }

  const sourceIds = sourcesParam.split(",").filter(Boolean)

  try {
    const results = await Promise.allSettled(
      sourceIds.map(async (id) => {
        try {
          const source = getSource(id)
          const data = await source.search(title, 5) // Search for top 5 matches
          
          // Try to find an exact or close match
          const normalizedTarget = title.toLowerCase().trim()
          const matches = (data || []).filter(m => {
            const mTitle = m.title.toLowerCase().trim()
            return mTitle.includes(normalizedTarget) || normalizedTarget.includes(mTitle)
          })

          return matches.map(m => ({
            sourceId: id,
            mangaId: m.id,
            title: m.title,
            cover: m.cover
          }))
        } catch (e) {
          return []
        }
      })
    )

    const matches = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)

    return NextResponse.json({ data: matches })
  } catch (error) {
    console.error("Error resolving manga sources:", error)
    return NextResponse.json({ error: "Failed to resolve sources" }, { status: 500 })
  }
}
