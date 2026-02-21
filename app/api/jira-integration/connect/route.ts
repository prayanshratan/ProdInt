import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, updateUser } from '@/lib/db'
import { verifyJiraConnection } from '@/lib/jira'

// GET — return current Jira connection status
export async function GET() {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        if (!user.jiraConfig) {
            return NextResponse.json({ connected: false })
        }

        return NextResponse.json({
            connected: true,
            domain: user.jiraConfig.domain,
            email: user.jiraConfig.email,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST — save & verify Jira credentials
export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { domain, email, apiToken } = await request.json()

        if (!domain || !email || !apiToken) {
            return NextResponse.json(
                { error: 'Domain, email and API token are required' },
                { status: 400 }
            )
        }

        const config = { domain: domain.trim(), email: email.trim(), apiToken: apiToken.trim() }

        // Verify with Jira before saving
        const verification = await verifyJiraConnection(config)
        if (!verification.valid) {
            return NextResponse.json({ error: verification.error }, { status: 400 })
        }

        await updateUser(session.userId, { jiraConfig: config })

        return NextResponse.json({
            success: true,
            displayName: verification.displayName,
            message: `Connected as ${verification.displayName}`,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE — disconnect Jira
export async function DELETE() {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        await updateUser(session.userId, { jiraConfig: undefined })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
