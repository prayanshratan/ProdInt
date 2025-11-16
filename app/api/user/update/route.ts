import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateUser } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const updates = await request.json()
    
    // Don't allow updating email or password through this endpoint
    delete updates.email
    delete updates.password
    delete updates.id
    delete updates.createdAt
    
    const user = await updateUser(session.userId, updates)
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        designation: user.designation,
        hasApiKey: !!user.apiKey
      }
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

