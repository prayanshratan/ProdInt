import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserTemplates, createTemplate } from '@/lib/db'
import { createDefaultTemplateForUser } from '@/lib/init-default-template'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user templates
    let userTemplates = await getUserTemplates(session.userId)
    
    // If user has no templates, create the default one for them
    if (userTemplates.length === 0) {
      await createDefaultTemplateForUser(session.userId)
      userTemplates = await getUserTemplates(session.userId)
    }
    
    return NextResponse.json({ templates: userTemplates })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { name, content, isDefault } = await request.json()
    
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      )
    }
    
    const template = await createTemplate({
      userId: session.userId,
      name,
      content,
      isDefault: isDefault || false,
    })
    
    return NextResponse.json({ template })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

