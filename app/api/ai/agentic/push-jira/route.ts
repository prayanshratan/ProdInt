import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'
import { createJiraTickets } from '@/lib/jira'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { chatId, finalStories, projectKey, featureTitle } = await request.json()

        const chat = await getChatById(chatId)
        if (!chat || chat.userId !== session.userId) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        const jiraConfig = user.jiraConfig as { domain: string; email: string; apiToken: string } | null
        if (!jiraConfig) return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })

        const jiraResult = await createJiraTickets(jiraConfig, projectKey, featureTitle, finalStories)

        // Final save
        const newMessages = [
            ...chat.messages,
            {
                role: 'user',
                content: '[Approved Stories — push to Jira]',
                timestamp: new Date().toISOString(),
            },
            {
                role: 'assistant',
                content: `Jira tickets created: ${jiraResult.storyKey} + ${jiraResult.tasks?.length ?? 0} sub-tasks`,
                jiraResult,          // ← store full result for history view
                timestamp: new Date().toISOString(),
            },
        ]

        await updateChat(chatId, { messages: newMessages as any[] })

        return NextResponse.json({ jiraResult })
    } catch (err: any) {
        console.error('push-jira error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
