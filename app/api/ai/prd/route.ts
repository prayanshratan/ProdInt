import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getTemplateById, getChatById, updateChat } from '@/lib/db'
import { generatePRD, continueConversation } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { chatId, message, onePager, additionalContext, templateId } = await request.json()
    
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
    
    // Get template content
    let template = ''
    if (templateId || chat.templateId) {
      const templateDoc = await getTemplateById(templateId || chat.templateId!)
      if (templateDoc) {
        template = templateDoc.content
      }
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
      // First message - generate PRD
      aiResponse = await generatePRD(
        user.apiKey,
        template,
        onePager || '',
        additionalContext || '',
        []
      )
    } else {
      // Continue conversation
      aiResponse = await continueConversation(
        user.apiKey,
        'prd',
        message,
        chat.messages.map(m => ({ role: m.role, content: m.content })),
        { template, onePager, additionalContext }
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
      prdDocument: aiResponse,
    })
    
    return NextResponse.json({ 
      response: aiResponse,
      chat: updatedChat
    })
  } catch (error: any) {
    console.error('PRD generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PRD' },
      { status: 500 }
    )
  }
}

