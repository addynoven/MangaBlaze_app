import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"
import { getSource } from "@/lib/sources"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookmarks = await db.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        manga: true,
      },
    })

    // Fetch latest chapters for each bookmarked manga
    // In a real app, this should be cached or done via a background worker
    // For now, we'll do it on-demand for a limited number of manga
    const updates = await Promise.all(
      bookmarks.slice(0, 20).map(async (bookmark) => {
        try {
          const source = getSource(bookmark.manga.sourceId)
          const chapters = await source.getChapters(bookmark.manga.realId, 1)
          const latestChapter = chapters[0]

          if (latestChapter) {
            return {
              manga: bookmark.manga,
              latestChapter,
            }
          }
          return null
        } catch (error) {
          console.error(`Error fetching updates for ${bookmark.manga.id}:`, error)
          return null
        }
      })
    )

    return NextResponse.json({ 
      data: updates.filter(Boolean).sort((a, b) => {
        const dateA = new Date(a!.latestChapter.publishedAt).getTime()
        const dateB = new Date(b!.latestChapter.publishedAt).getTime()
        return dateB - dateA
      })
    })
  } catch (error) {
    console.error("Error fetching updates:", error)
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 })
  }
}
