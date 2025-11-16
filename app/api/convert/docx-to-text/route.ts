import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { docxToText } from '@/lib/docx-utils'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Only .docx files are supported' },
        { status: 400 }
      )
    }
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await docxToText(buffer)
    
    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('Docx conversion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to convert file' },
      { status: 500 }
    )
  }
}

