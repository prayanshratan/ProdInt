import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTextExtractor } from 'office-text-extractor'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

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

        if (!file.name.endsWith('.pptx')) {
            return NextResponse.json(
                { error: 'Only .pptx files are supported' },
                { status: 400 }
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Write to temp file
        const tempDir = os.tmpdir()
        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pptx`)

        await fs.writeFile(tempFilePath, buffer)

        try {
            const extractor = getTextExtractor()
            const text = await extractor.extractText({ input: tempFilePath, type: 'file' })

            // Cleanup
            await fs.unlink(tempFilePath)

            return NextResponse.json({ text })
        } catch (extractError) {
            // Try to cleanup even if extraction fails
            try { await fs.unlink(tempFilePath) } catch { }
            throw extractError
        }

    } catch (error: any) {
        console.error('PPTX conversion error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to convert file' },
            { status: 500 }
        )
    }
}
