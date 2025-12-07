import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'
import { generateErrorAnalysis, generateRCA, continueConversation } from '@/lib/gemini'
import fs from 'fs/promises'
import path from 'path'

// Load default RCA templates
async function getDefaultTemplate(type: 'user-facing' | 'technical'): Promise<string> {
  const filename = type === 'user-facing' 
    ? 'User_Facing_RCA_Template.md' 
    : 'Technical_Engineering_RCA_Template.md'
  const templatePath = path.join(process.cwd(), 'kb', filename)
  
  try {
    return await fs.readFile(templatePath, 'utf-8')
  } catch (error) {
    console.error(`Failed to load template ${filename}:`, error)
    return ''
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
    
    const { 
      chatId, 
      message, 
      errorLogs, 
      additionalContext, 
      rcaType,
      customUserFacingTemplate,
      customTechnicalTemplate 
    } = await request.json()
    
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
      // First message - generate based on rcaType
      if (rcaType === 'analysis') {
        // Error Analysis only
        aiResponse = await generateErrorAnalysis(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          []
        )
      } else if (rcaType === 'user-facing') {
        // User-facing RCA only
        const defaultTemplate = await getDefaultTemplate('user-facing')
        aiResponse = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'user-facing',
          customUserFacingTemplate || null,
          defaultTemplate,
          []
        )
      } else if (rcaType === 'technical') {
        // Technical Engineering RCA only
        const defaultTemplate = await getDefaultTemplate('technical')
        aiResponse = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'technical',
          customTechnicalTemplate || null,
          defaultTemplate,
          []
        )
      } else if (rcaType === 'both') {
        // Both User-facing and Technical RCAs
        const userFacingTemplate = await getDefaultTemplate('user-facing')
        const technicalTemplate = await getDefaultTemplate('technical')
        
        const userFacingRCA = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'user-facing',
          customUserFacingTemplate || null,
          userFacingTemplate,
          []
        )
        
        const technicalRCA = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'technical',
          customTechnicalTemplate || null,
          technicalTemplate,
          []
        )
        
        aiResponse = `# User-Facing RCA\n\n${userFacingRCA}\n\n---\n\n# Technical Engineering RCA\n\n${technicalRCA}`
      } else if (rcaType === 'all') {
        // Error Analysis + Both RCAs
        const errorAnalysis = await generateErrorAnalysis(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          []
        )
        
        const userFacingTemplate = await getDefaultTemplate('user-facing')
        const technicalTemplate = await getDefaultTemplate('technical')
        
        const userFacingRCA = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'user-facing',
          customUserFacingTemplate || null,
          userFacingTemplate,
          []
        )
        
        const technicalRCA = await generateRCA(
          user.apiKey,
          errorLogs || '',
          additionalContext || '',
          'technical',
          customTechnicalTemplate || null,
          technicalTemplate,
          []
        )
        
        aiResponse = `# Error Analysis\n\n${errorAnalysis}\n\n---\n\n# User-Facing RCA\n\n${userFacingRCA}\n\n---\n\n# Technical Engineering RCA\n\n${technicalRCA}`
      } else {
        return NextResponse.json(
          { error: 'Invalid RCA type' },
          { status: 400 }
        )
      }
    } else {
      // Continue conversation
      aiResponse = await continueConversation(
        user.apiKey,
        'rca',
        message,
        chat.messages.map(m => ({ role: m.role, content: m.content })),
        { rcaType: chat.rcaType }
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
      rcaDocument: aiResponse,
      rcaType: rcaType || chat.rcaType,
    })
    
    return NextResponse.json({ 
      response: aiResponse,
      chat: updatedChat
    })
  } catch (error: any) {
    console.error('RCA generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate RCA' },
      { status: 500 }
    )
  }
}

