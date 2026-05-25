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
        manga: {
          include: {
            readingProgress: {
              where: { userId: session.user.id }
            }
          }
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ 
      data: bookmarks.map(b => ({
        ...b.manga,
        status: b.status,
        progress: b.manga.readingProgress?.[0] || null
      })) 
    })
  } catch (error) {
    console.error("Error fetching bookmarks:", error)
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { mangaId, sourceId, mangaData, status } = await request.json()

    if (!mangaId || !sourceId) {
      return NextResponse.json({ error: "Missing mangaId or sourceId" }, { status: 400 })
    }

    const compositeId = `${sourceId}:${mangaId}`

    // Ensure manga exists in our DB cache
    await db.manga.upsert({
      where: { id: compositeId },
      update: {
        title: mangaData?.title,
        coverUrl: mangaData?.cover,
        description: mangaData?.description,
        status: mangaData?.status,
        year: mangaData?.year,
        updatedAt: new Date(),
      },
      create: {
        id: compositeId,
        sourceId,
        realId: mangaId,
        title: mangaData?.title || "Unknown",
        coverUrl: mangaData?.cover || "",
        description: mangaData?.description || "",
        status: mangaData?.status || "releasing",
        year: mangaData?.year || null,
      },
    })

    // Toggle bookmark or update status
    const existing = await db.bookmark.findUnique({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: compositeId,
        },
      },
    })

    if (existing) {
      if (status) {
        // Update status if it's a different one
        const updated = await db.bookmark.update({
          where: { id: existing.id },
          data: { status }
        })
        return NextResponse.json({ bookmarked: true, status: updated.status })
      } else {
        // Normal toggle behavior (delete)
        await db.bookmark.delete({
          where: { id: existing.id },
        })
        return NextResponse.json({ bookmarked: false })
      }
    } else {
      const created = await db.bookmark.create({
        data: {
          userId: session.user.id,
          mangaId: compositeId,
          status: status || "reading"
        },
      })
      return NextResponse.json({ bookmarked: true, status: created.status })
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error)
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 })
  }
}
