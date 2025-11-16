import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'
import { generateUserStories, continueConversation } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { chatId, message, context, template, acceptanceCriteriaFormat } = await request.json()
    
    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const chat = await getChatById(chatId)
    if (!chat || chat.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }
    
    // Add user message to history
    const newMessages = [
      ...chat.messages,
      {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      }
    ]
    
    // Generate or continue conversation
    let aiResponse: string
    
    if (chat.messages.length === 0) {
      // First message - generate user stories
      aiResponse = await generateUserStories(
        user.apiKey,
        context || message,
        template || null,
        acceptanceCriteriaFormat || null,
        []
      )
    } else {
      // Continue conversation
      aiResponse = await continueConversation(
        user.apiKey,
        'jira',
        message,
        chat.messages.map(m => ({ role: m.role, content: m.content }))
      )
    }
    
    // Add AI response to messages
    newMessages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    })
    
    // Update chat
    const updatedChat = await updateChat(chatId, {
      messages: newMessages,
    })
    
    return NextResponse.json({ 
      response: aiResponse,
      chat: updatedChat
    })
  } catch (error: any) {
    console.error('User story generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate user stories' },
      { status: 500 }
    )
  }
}

