import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'
import { continueConversation } from '@/lib/gemini'

// Refine PRD or Stories via chat message
export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { chatId, message, stage, currentContent } = await request.json()
        // stage: 'prd' | 'stories'

        const chat = await getChatById(chatId)
        if (!chat || chat.userId !== session.userId) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        // Build conversation history for the LLM:
        // The current content is the last assistant message
        const history = [
            ...chat.messages.map((m: any) => ({ role: m.role, content: m.content })),
            // Override with the freshest content (user may have edited inline)
            { role: 'assistant', content: currentContent },
        ]

        const response = await continueConversation(
            user.apiKey,
            stage === 'stories' ? 'jira' : 'prd',
            message,
            history
        )

        // Persist the new message pair
        const newMessages = [
            ...chat.messages,
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() },
        ]

        await updateChat(chatId, {
            messages: newMessages,
            ...(stage === 'prd' ? { prdDocument: response } : {}),
        })

        return NextResponse.json({ response })
    } catch (err: any) {
        console.error('agentic chat error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
