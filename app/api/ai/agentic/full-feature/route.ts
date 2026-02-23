import { getSession } from '@/lib/auth'
import { getUserById, createChat, updateChat } from '@/lib/db'
import { generatePRD, generateUserStories } from '@/lib/gemini'
import { createJiraTickets } from '@/lib/jira'

export async function POST(request: Request) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            try {
                // ── Auth ──────────────────────────────────────────────
                const session = await getSession()
                if (!session) {
                    send({ type: 'error', message: 'Unauthorized' })
                    controller.close()
                    return
                }

                const user = await getUserById(session.userId)
                if (!user) {
                    send({ type: 'error', message: 'User not found' })
                    controller.close()
                    return
                }

                const { feature, jiraProjectKey, templateContent } = await request.json()

                if (!feature?.trim()) {
                    send({ type: 'error', message: 'Feature description is required' })
                    controller.close()
                    return
                }

                // ── Create a chat to persist the session ──────────────
                const chat = await createChat({
                    userId: session.userId,
                    type: 'jira',
                    title: feature.slice(0, 60),
                    messages: [],
                })

                // ── Step 1: Generate PRD ──────────────────────────────
                send({ type: 'step', step: 1, status: 'running', label: 'Generating PRD...' })

                const prdContent = await generatePRD(
                    user.apiKey,
                    templateContent || '',
                    feature,
                    `Generate a comprehensive PRD for this feature. Be thorough with requirements, user flows, and success metrics.`,
                    []
                )

                send({ type: 'step', step: 1, status: 'done', label: 'PRD Generated', content: prdContent })

                // ── Step 2: Generate User Stories ─────────────────────
                send({ type: 'step', step: 2, status: 'running', label: 'Generating User Stories...' })

                const storiesContent = await generateUserStories(
                    user.apiKey,
                    `Feature: ${feature}\n\nPRD Content:\n${prdContent}`,
                    null,
                    null,
                    []
                )

                send({ type: 'step', step: 2, status: 'done', label: 'User Stories Generated', content: storiesContent })

                // ── Save PRD + stories to chat ────────────────────────
                await updateChat(chat.id, {
                    messages: [
                        { role: 'user', content: feature, timestamp: new Date().toISOString() },
                        { role: 'assistant', content: `## PRD\n\n${prdContent}\n\n---\n\n## User Stories\n\n${storiesContent}`, timestamp: new Date().toISOString() }
                    ],
                    prdDocument: prdContent,
                })

                // ── Step 3: Create Jira Tickets (if connected) ────────
                const jiraConfig = user.jiraConfig as { domain: string; email: string; apiToken: string } | null

                if (jiraConfig && jiraProjectKey) {
                    send({ type: 'step', step: 3, status: 'running', label: 'Creating Jira Tickets...' })

                    try {
                        const jiraResult = await createJiraTickets(
                            jiraConfig,
                            jiraProjectKey,
                            feature,
                            storiesContent
                        )

                        send({
                            type: 'step',
                            step: 3,
                            status: 'done',
                            label: `Created ${jiraResult.tasks?.length ?? 0} Jira Tickets`,
                            jiraResult,
                        })
                    } catch (jiraError: any) {
                        send({
                            type: 'step',
                            step: 3,
                            status: 'error',
                            label: 'Jira creation failed',
                            error: jiraError.message,
                        })
                    }
                } else {
                    send({ type: 'step', step: 3, status: 'skipped', label: 'Jira not connected — skipped' })
                }

                // ── Done ──────────────────────────────────────────────
                send({ type: 'complete', chatId: chat.id })

            } catch (err: any) {
                console.error('Agentic pipeline error:', err)
                try {
                    encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
                } catch { }
            } finally {
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
