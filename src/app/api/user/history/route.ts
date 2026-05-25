import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const history = await db.readingProgress.findMany({
      where: { userId: session.user.id },
      include: {
        manga: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ 
      data: history.map(h => ({
        ...h.manga,
        progress: {
          chapterId: h.chapterId,
          chapterNumber: h.chapterNumber,
          pageIndex: h.pageIndex,
          updatedAt: h.updatedAt
        }
      }))
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
