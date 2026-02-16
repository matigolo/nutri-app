import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/meals
 * 
 * Fetch meals for a specific profile and date range.
 * 
 * TODO: Connect to MySQL backend
 * Query params:
 *   - profileId: string
 *   - date: string (YYYY-MM-DD) - specific date
 *   - from/to: string - date range
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get("profileId")
  const date = searchParams.get("date")

  // TODO: Query MySQL: SELECT * FROM meals WHERE profile_id = ? AND date = ?
  
  return NextResponse.json({
    meals: [],
    message: "API route prepared. Connect to backend.",
    params: { profileId, date },
  })
}

/**
 * POST /api/meals
 * 
 * Create a new meal entry.
 * 
 * TODO: Connect to MySQL backend
 * Body: MealEntry object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: INSERT INTO meals (...) VALUES (...)
    // TODO: INSERT INTO meal_items (...) VALUES (...) for each item
    
    return NextResponse.json({
      success: true,
      message: "Meal saved. API route prepared for backend.",
      data: body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
