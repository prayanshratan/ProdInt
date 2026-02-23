import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, createChat, updateChat } from '@/lib/db'
import { generatePRD, getGeminiClient } from '@/lib/gemini'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await getUserById(session.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { feature } = await request.json()
        if (!feature?.trim()) return NextResponse.json({ error: 'Feature required' }, { status: 400 })

        // Generate a concise title
        let featureTitle = feature.slice(0, 60)
        try {
            const genAI = getGeminiClient(user.apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
            const res = await model.generateContent(
                `In 4-6 words maximum, write a concise Jira epic title for this feature. Return ONLY the title — no quotes, no punctuation at the end.\n\nFeature:\n${feature}`
            )
            const t = res.response.text().trim().replace(/^["']|["']$/g, '')
            if (t && t.length < 80) featureTitle = t
        } catch { }

        // Create agentic chat
        const chat = await createChat({
            userId: session.userId,
            type: 'jira',
            title: featureTitle,
            messages: [],
            rcaType: 'agentic' as any,
        })

        // Generate PRD
        const prd = await generatePRD(
            user.apiKey,
            '',
            feature,
            'Generate a comprehensive PRD. Be thorough with requirements, user flows, and success metrics.',
            []
        )

        // Save initial message pair
        await updateChat(chat.id, {
            messages: [
                { role: 'user', content: feature, timestamp: new Date().toISOString() },
                { role: 'assistant', content: prd, timestamp: new Date().toISOString() },
            ],
            prdDocument: prd,
        })

        return NextResponse.json({ chatId: chat.id, featureTitle, prd })
    } catch (err: any) {
        console.error('generate-prd error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
