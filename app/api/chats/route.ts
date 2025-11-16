import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserChats, createChat, getUserTemplates } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const chats = await getUserChats(session.userId)
    
    return NextResponse.json({ chats })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
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
    
    const { type, title, templateId } = await request.json()
    
    // If no template specified and it's a PRD, use the default template
    let finalTemplateId = templateId
    if (!finalTemplateId && type === 'prd') {
      const userTemplates = await getUserTemplates(session.userId)
      const defaultTemplate = userTemplates.find(t => t.isDefault)
      if (defaultTemplate) {
        finalTemplateId = defaultTemplate.id
      }
    }
    
    const chat = await createChat({
      userId: session.userId,
      type,
      title,
      messages: [],
      templateId: finalTemplateId,
    })
    
    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Create chat error:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}

