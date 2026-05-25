import { NextResponse } from "next/server"
import { getSource } from "@/lib/sources"

export async function GET(request: Request) {
  // Discovery sources - Pick a few high-quality ones
  const discoverySources = ["mangadex", "asurascans", "comick"]

  try {
    const results = await Promise.allSettled(
      discoverySources.map(async (id) => {
        try {
          const source = getSource(id)
          const data = await source.search("", 10) // Get top 10 from each
          return (data || []).map(m => ({ ...m, source: id }))
        } catch (e) {
          return []
        }
      })
    )

    const allResults = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)

    // Shuffle results slightly to keep it fresh
    const shuffled = allResults.sort(() => Math.random() - 0.5)

    return NextResponse.json({ data: shuffled.slice(0, 30) })
  } catch (error) {
    console.error("Error fetching discovery feed:", error)
    return NextResponse.json({ error: "Failed to fetch discovery feed" }, { status: 500 })
  }
}
