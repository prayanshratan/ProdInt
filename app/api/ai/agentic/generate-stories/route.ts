import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'
import { generateUserStories } from '@/lib/gemini'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { chatId, finalPrd } = await request.json()

        const chat = await getChatById(chatId)
        if (!chat || chat.userId !== session.userId) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        const stories = await generateUserStories(
            user.apiKey,
            `Feature context from PRD:\n\n${finalPrd}`,
            null,
            null,
            []
        )

        // Append to chat messages
        const newMessages = [
            ...chat.messages,
            {
                role: 'user',
                content: '[Approved PRD — generate user stories]',
                timestamp: new Date().toISOString(),
            },
            {
                role: 'assistant',
                content: stories,
                timestamp: new Date().toISOString(),
            },
        ]

        await updateChat(chatId, { messages: newMessages, prdDocument: finalPrd })

        return NextResponse.json({ stories })
    } catch (err: any) {
        console.error('generate-stories error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
