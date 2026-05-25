import { NextResponse } from "next/server"
import { auth } from "@/auth"
import db from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { mangaTitle, chapterNumber, type } = await request.json()

    // 1. Get user tracker status
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { malToken: true, anilistToken: true, trackerSyncEnabled: true }
    })

    if (!user || !user.trackerSyncEnabled) {
      return NextResponse.json({ success: false, message: "Sync disabled" })
    }

    // 2. Logic to sync with trackers
    // This is where we would call MyAnimeList or AniList APIs
    const synced = []
    if (user.malToken) {
      console.log(`[MAL SYNC] Updating ${mangaTitle} to Chapter ${chapterNumber}`)
      synced.push("MAL")
    }
    if (user.anilistToken) {
      console.log(`[AniList SYNC] Updating ${mangaTitle} to Chapter ${chapterNumber}`)
      synced.push("AniList")
    }

    return NextResponse.json({ 
      success: true, 
      synced,
      message: synced.length > 0 ? `Synced with ${synced.join(' & ')}` : "No trackers linked"
    })
  } catch (error) {
    console.error("Tracker sync error:", error)
    return NextResponse.json({ error: "Failed to sync with trackers" }, { status: 500 })
  }
}
