import { NextResponse } from 'next/server'
import { createUser } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { validateEmail, isTemporaryEmail } from '@/lib/utils'
import { createDefaultTemplateForUser } from '@/lib/init-default-template'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()
    
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }
    
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    if (isTemporaryEmail(email)) {
      return NextResponse.json(
        { error: 'Temporary email addresses are not allowed. Please use a valid email address.' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    const user = await createUser({ name, email, password })
    await createSession(user)
    
    // Create default PRD template for new user
    await createDefaultTemplateForUser(user.id)
    
    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}

