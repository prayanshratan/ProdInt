import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { markdownToDocx } from '@/lib/docx-utils'

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
    
    const buffer = await markdownToDocx(markdown, title || 'Document')
    
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title || 'document'}.docx"`,
      },
    })
  } catch (error: any) {
    console.error('Markdown to docx conversion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to convert markdown to docx' },
      { status: 500 }
    )
  }
}

