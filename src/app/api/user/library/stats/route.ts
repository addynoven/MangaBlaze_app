import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookmarks = await db.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        manga: true
      }
    })

    const progress = await db.readingProgress.findMany({
      where: { userId: session.user.id }
    })

    // 1. Status Breakdown
    const statusCounts = bookmarks.reduce((acc: any, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1
      return acc
    }, {})

    // 2. Genre Breakdown
    const genreMap = new Map<string, number>()
    bookmarks.forEach(b => {
      if (b.manga.tags) {
        try {
          const tags = JSON.parse(b.manga.tags)
          if (Array.isArray(tags)) {
            tags.forEach(t => {
              genreMap.set(t, (genreMap.get(t) || 0) + 1)
            })
          }
        } catch (e) {}
      }
    })

    const topGenres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // 3. Estimated Chapters Read
    // We sum up the chapter numbers from progress. 
    // This is a rough estimate since chapterNumber is a string.
    const totalChapters = progress.reduce((sum, p) => {
      const num = parseFloat(p.chapterNumber || "0")
      return sum + (isNaN(num) ? 0 : num)
    }, 0)

    return NextResponse.json({
      data: {
        totalBookmarks: bookmarks.length,
        statusCounts,
        topGenres,
        estimatedChaptersRead: Math.floor(totalChapters),
        mangaRead: progress.length
      }
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: "Failed to calculate stats" }, { status: 500 })
  }
}
