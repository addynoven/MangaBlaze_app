import { NextResponse } from "next/server"
import db from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { sourceId, success, latency, error } = await request.json()

    if (!sourceId) {
      return NextResponse.json({ error: "Missing sourceId" }, { status: 400 })
    }

    const existing = await db.sourceHealth.findUnique({
      where: { sourceId }
    })

    let status = "online"
    if (!success) {
      const newErrorCount = (existing?.errorCount || 0) + 1
      status = newErrorCount >= 5 ? "offline" : (existing?.status || "online")
      
      await db.sourceHealth.upsert({
        where: { sourceId },
        update: {
          errorCount: newErrorCount,
          lastError: error || "Unknown error",
          status: status,
          lastChecked: new Date()
        },
        create: {
          sourceId,
          errorCount: newErrorCount,
          lastError: error || "Unknown error",
          status: status,
          lastChecked: new Date(),
          lastLatency: latency || 0
        }
      })
    } else {
      // Success
      status = (latency > 3000) ? "slow" : "online"
      await db.sourceHealth.upsert({
        where: { sourceId },
        update: {
          errorCount: 0,
          lastLatency: latency,
          status: status,
          lastChecked: new Date(),
          lastError: null
        },
        create: {
          sourceId,
          errorCount: 0,
          lastLatency: latency,
          status: status,
          lastChecked: new Date()
        }
      })
    }

    return NextResponse.json({ status })
  } catch (error) {
    console.error("Error reporting health:", error)
    return NextResponse.json({ error: "Failed to report health" }, { status: 500 })
  }
}
