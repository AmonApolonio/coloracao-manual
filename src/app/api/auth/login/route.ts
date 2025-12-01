import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const validUsername = (process.env.APP_USERNAME || '').trim()
    const validPassword = (process.env.APP_PASSWORD || '').trim()
    const adminPassword = (process.env.APP_ADMIN_PASSWORD || '').trim()

    // Validate credentials
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (username === validUsername && (password === validPassword || password === adminPassword)) {
      const isAdmin = password === adminPassword
      return NextResponse.json(
        {
          success: true,
          isAdmin,
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
