import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getChatById, updateChat } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const jiraConfig = user.jiraConfig as { domain: string; email: string; apiToken: string } | null
        if (!jiraConfig) return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })

        const { chatId, storyKey } = await request.json()
        if (!storyKey) return NextResponse.json({ error: 'storyKey required' }, { status: 400 })

        const domain = jiraConfig.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const baseUrl = `https://${domain}`
        const headers = {
            Authorization: `Basic ${Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        }

        // Fetch parent story + its subtask stubs
        const issueRes = await fetch(
            `${baseUrl}/rest/api/3/issue/${storyKey}?fields=summary,subtasks`,
            { headers }
        )
        if (!issueRes.ok) {
            return NextResponse.json({ error: `Jira returned ${issueRes.status}` }, { status: 502 })
        }
        const issueData = await issueRes.json()

        const storyUrl = `${baseUrl}/browse/${storyKey}`
        const tasks: Array<{ key: string; title: string; url: string }> = (
            issueData.fields?.subtasks || []
        ).map((st: any) => ({
            key: st.key,
            title: st.fields?.summary || st.key,
            url: `${baseUrl}/browse/${st.key}`,
        }))

        const jiraResult = { storyKey, storyUrl, tasks }

        // Update the chat message in-place so future history views get the full result
        if (chatId) {
            const chat = await getChatById(chatId)
            if (chat && chat.userId === session.userId) {
                const updatedMessages = (chat.messages as any[]).map((m: any) =>
                    m.content?.startsWith('Jira tickets created') ? { ...m, jiraResult } : m
                )
                await updateChat(chatId, { messages: updatedMessages })
            }
        }

        return NextResponse.json({ jiraResult })
    } catch (err: any) {
        console.error('fetch-jira-result error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
