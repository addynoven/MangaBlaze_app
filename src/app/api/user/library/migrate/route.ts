import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"
import { getSource } from "@/lib/sources"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fromMangaId, toSourceId, toMangaId } = await request.json()

    if (!fromMangaId || !toSourceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Get the original manga metadata
    const originalManga = await db.manga.findUnique({
      where: { id: fromMangaId }
    })

    if (!originalManga) {
      return NextResponse.json({ error: "Original manga not found" }, { status: 404 })
    }

    let targetMangaRealId = toMangaId
    let targetMangaData: any = null

    // 2. If no target ID provided, try to resolve automatically
    if (!targetMangaRealId) {
      const source = getSource(toSourceId)
      const results = await source.search(originalManga.title, 5)
      const normalizedTitle = originalManga.title.toLowerCase().trim()
      const match = results?.find(m => m.title.toLowerCase().trim() === normalizedTitle) || results?.[0]
      
      if (!match) {
        return NextResponse.json({ error: "No match found on target source" }, { status: 404 })
      }
      targetMangaRealId = match.id
      targetMangaData = match
    } else {
      // Fetch data for upsert if we only have the ID
      const source = getSource(toSourceId)
      targetMangaData = await source.getManga(targetMangaRealId)
    }

    const compositeTargetId = `${toSourceId}:${targetMangaRealId}`

    // 3. Ensure target manga exists in DB cache
    await db.manga.upsert({
      where: { id: compositeTargetId },
      update: {
        title: targetMangaData?.title || originalManga.title,
        coverUrl: targetMangaData?.cover || originalManga.coverUrl,
        updatedAt: new Date(),
      },
      create: {
        id: compositeTargetId,
        sourceId: toSourceId,
        realId: targetMangaRealId,
        title: targetMangaData?.title || originalManga.title,
        coverUrl: targetMangaData?.cover || originalManga.coverUrl || "",
        status: targetMangaData?.status || originalManga.status || "releasing",
      },
    })

    // 4. Migrate the bookmark
    const bookmark = await db.bookmark.findUnique({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: fromMangaId,
        },
      },
    })

    if (bookmark) {
      // Update bookmark to new manga, preserving status
      await db.bookmark.update({
        where: { id: bookmark.id },
        data: { mangaId: compositeTargetId }
      })
    }

    // 5. Migrate reading progress
    const progress = await db.readingProgress.findUnique({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: fromMangaId,
        },
      },
    })

    if (progress) {
      // We can't map exact chapter IDs across sources easily,
      // but we can preserve the chapter number and page.
      // The user might need to re-select the chapter on first read,
      // but 'Continue Reading' will use the number to try and find it.
      await db.readingProgress.upsert({
        where: {
          userId_mangaId: {
            userId: session.user.id,
            mangaId: compositeTargetId,
          },
        },
        update: {
          chapterNumber: progress.chapterNumber,
          pageIndex: progress.pageIndex,
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          mangaId: compositeTargetId,
          chapterNumber: progress.chapterNumber,
          pageIndex: progress.pageIndex,
        },
      })

      // Delete old progress to keep it clean
      await db.readingProgress.delete({
        where: { id: progress.id }
      })
    }

    return NextResponse.json({ success: true, newId: compositeTargetId })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: "Failed to migrate manga" }, { status: 500 })
  }
}
