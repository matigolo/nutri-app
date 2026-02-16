import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/weight
 * 
 * Fetch weight records for a specific profile.
 * 
 * TODO: Connect to MySQL backend
 * Query params:
 *   - profileId: string
 *   - from/to: string - date range
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get("profileId")

  // TODO: Query MySQL: SELECT * FROM weight_records WHERE profile_id = ? ORDER BY date DESC
  
  return NextResponse.json({
    weights: [],
    message: "API route prepared. Connect to backend.",
    params: { profileId },
  })
}

/**
 * POST /api/weight
 * 
 * Record a weight entry for a specific profile and date.
 * 
 * TODO: Connect to MySQL backend
 * Body: { profileId: string, date: string, weight: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: INSERT INTO weight_records (profile_id, date, weight) VALUES (?, ?, ?)
    //       ON DUPLICATE KEY UPDATE weight = ?
    
    return NextResponse.json({
      success: true,
      message: "Weight saved. API route prepared for backend.",
      data: body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
