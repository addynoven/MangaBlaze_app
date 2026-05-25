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
        manga: {
          include: {
            readingProgress: {
              where: { userId: session.user.id }
            }
          }
        },
      },
    })

    // Sync logic: check if the latest chapter on the source is different from our last read chapter
    const updates = await Promise.allSettled(
      bookmarks.slice(0, 40).map(async (bookmark) => {
        try {
          const source = getSource(bookmark.manga.sourceId)
          const chapters = await source.getChapters(bookmark.manga.realId, 1)
          const latestChapter = chapters[0]
          const lastReadChapterId = bookmark.manga.readingProgress?.[0]?.chapterId

          // If we have a latest chapter and it doesn't match our last read one
          if (latestChapter && latestChapter.id !== lastReadChapterId) {
            return bookmark.mangaId // This manga has unread chapters
          }
          return null
        } catch (e) {
          return null
        }
      })
    )

    const unreadMangaIds = updates
      .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled" && !!r.value)
      .map(r => r.value as string)

    return NextResponse.json({ unreadMangaIds })
  } catch (error) {
    console.error("Error syncing library:", error)
    return NextResponse.json({ error: "Failed to sync library" }, { status: 500 })
  }
}
