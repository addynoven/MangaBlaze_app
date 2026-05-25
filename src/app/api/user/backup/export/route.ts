import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Collect all user-related data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        malToken: true,
        anilistToken: true,
        trackerSyncEnabled: true
      }
    })

    const bookmarks = await db.bookmark.findMany({
      where: { userId: session.user.id },
      include: { manga: true }
    })

    const progress = await db.readingProgress.findMany({
      where: { userId: session.user.id },
      include: { manga: true }
    })

    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      userPrefs: user,
      library: bookmarks.map(b => ({
        sourceId: b.manga.sourceId,
        mangaId: b.manga.realId,
        title: b.manga.title,
        status: b.status,
        addedAt: b.createdAt
      })),
      history: progress.map(p => ({
        sourceId: p.manga.sourceId,
        mangaId: p.manga.realId,
        title: p.manga.title,
        chapterId: p.chapterId,
        chapterNumber: p.chapterNumber,
        pageIndex: p.pageIndex,
        updatedAt: p.updatedAt
      }))
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error("Backup error:", error)
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 })
  }
}
