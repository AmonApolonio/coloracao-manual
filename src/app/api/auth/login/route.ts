import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const validUsername = (process.env.APP_USERNAME || '').trim()
    const validPassword = (process.env.APP_PASSWORD || '').trim()
    const adminUsername = (process.env.APP_ADMIN_USERNAME || '').trim()
    const adminPassword = (process.env.APP_ADMIN_PASSWORD || '').trim()

    // Validate credentials
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check regular user credentials
    if (username === validUsername && password === validPassword) {
      return NextResponse.json(
        {
          success: true,
          isAdmin: false,
        },
        { status: 200 }
      )
    }

    // Check admin credentials
    if (username === adminUsername && password === adminPassword) {
      return NextResponse.json(
        {
          success: true,
          isAdmin: true,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
