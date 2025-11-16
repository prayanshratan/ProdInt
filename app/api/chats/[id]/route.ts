import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getChatById, updateChat, deleteChat } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const chat = await getChatById(params.id)
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }
    
    if (chat.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Get chat error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const chat = await getChatById(params.id)
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }
    
    if (chat.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const updates = await request.json()
    const updatedChat = await updateChat(params.id, updates)
    
    return NextResponse.json({ chat: updatedChat })
  } catch (error) {
    console.error('Update chat error:', error)
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const chat = await getChatById(params.id)
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }
    
    if (chat.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    await deleteChat(params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete chat error:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}

