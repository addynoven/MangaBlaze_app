import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ bookmarked: false })
  }

  const { searchParams } = new URL(request.url)
  const mangaId = searchParams.get("mangaId")
  const sourceId = searchParams.get("sourceId")

  if (!mangaId || !sourceId) {
    return NextResponse.json({ bookmarked: false })
  }

  try {
    const compositeId = `${sourceId}:${mangaId}`
    const bookmark = await db.bookmark.findUnique({
      where: {
        userId_mangaId: {
          userId: session.user.id,
          mangaId: compositeId,
        },
      },
    })

    return NextResponse.json({ bookmarked: !!bookmark })
  } catch (error) {
    return NextResponse.json({ bookmarked: false })
  }
}
