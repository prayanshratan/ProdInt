import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById } from '@/lib/db'
import { createJiraTickets } from '@/lib/jira'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        if (!user.jiraConfig) {
            return NextResponse.json({ error: 'Jira not connected. Please connect your Jira account in API Keys settings.' }, { status: 400 })
        }

        const { projectKey, featureTitle, markdown } = await request.json()

        if (!projectKey || !featureTitle || !markdown) {
            return NextResponse.json(
                { error: 'projectKey, featureTitle, and markdown are required' },
                { status: 400 }
            )
        }

        const result = await createJiraTickets(
            user.jiraConfig,
            projectKey,
            featureTitle,
            markdown
        )

        return NextResponse.json({
            success: true,
            storyKey: result.storyKey,
            storyUrl: result.storyUrl,
            tasks: result.tasks,
            summary: `Created 1 Story (${result.storyKey}) with ${result.tasks.length} sub-task(s)`,
        })
    } catch (error: any) {
        console.error('Jira ticket creation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
