import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mangaId = searchParams.get("mangaId")
  const sourceId = searchParams.get("sourceId")

  if (!mangaId || !sourceId) {
    return NextResponse.json({ error: "Missing mangaId or sourceId" }, { status: 400 })
  }

  try {
    const compositeId = `${sourceId}:${mangaId}`
    const progress = await db.readingProgress.findUnique({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: compositeId,
        },
      },
    })

    return NextResponse.json({ data: progress })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { mangaId, sourceId, chapterId, chapterNumber, pageIndex, mangaData } = await request.json()

    if (!mangaId || !sourceId) {
      return NextResponse.json({ error: "Missing mangaId or sourceId" }, { status: 400 })
    }

    const compositeId = `${sourceId}:${mangaId}`

    // Ensure manga exists in DB cache (same logic as bookmarks)
    await db.manga.upsert({
      where: { id: compositeId },
      update: {
        title: mangaData?.title,
        coverUrl: mangaData?.cover,
        updatedAt: new Date(),
      },
      create: {
        id: compositeId,
        sourceId,
        realId: mangaId,
        title: mangaData?.title || "Unknown",
        coverUrl: mangaData?.cover || "",
        status: mangaData?.status || "releasing",
      },
    })

    // Upsert reading progress
    const progress = await db.readingProgress.upsert({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: compositeId,
        },
      },
      update: {
        chapterId,
        chapterNumber,
        pageIndex: pageIndex || 1,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        mangaId: compositeId,
        chapterId,
        chapterNumber,
        pageIndex: pageIndex || 1,
      },
    })

    return NextResponse.json({ data: progress })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 })
  }
}
