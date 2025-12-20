import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { markdownToPptx } from '@/lib/pptx-utils'

export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { markdown, title } = await request.json()

        if (!markdown) {
            return NextResponse.json(
                { error: 'No markdown content provided' },
                { status: 400 }
            )
        }

        const buffer = await markdownToPptx(markdown, title || 'Presentation')

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${title || 'presentation'}.pptx"`,
            },
        })
    } catch (error: any) {
        console.error('Markdown to pptx conversion error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to convert markdown to pptx' },
            { status: 500 }
        )
    }
}
