import { NextResponse } from "next/server"
import db from "@/lib/db"

export async function GET() {
  try {
    const health = await db.sourceHealth.findMany()
    return NextResponse.json({ data: health })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch health data" }, { status: 500 })
  }
}
