import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById } from '@/lib/db'
import { listJiraProjects } from '@/lib/jira'

export async function GET() {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        if (!user.jiraConfig) {
            return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })
        }

        const projects = await listJiraProjects(user.jiraConfig)

        return NextResponse.json({
            projects: projects.map(p => ({
                id: p.id,
                key: p.key,
                name: p.name,
                type: p.projectTypeKey,
                avatar: p.avatarUrls?.['48x48'],
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
