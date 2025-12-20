import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import PizZip from 'pizzip'

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

        try {
            // Use PizZip to unzip the PPTX in memory
            const zip = new PizZip(buffer)

            // Find all slide files
            const slideFiles = Object.keys(zip.files).filter(fileName =>
                fileName.match(/^ppt\/slides\/slide\d+\.xml$/)
            )

            // Sort slides by number (slide1.xml, slide2.xml, etc.)
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/)![1])
                const numB = parseInt(b.match(/slide(\d+)\.xml/)![1])
                return numA - numB
            })

            let structuredText = ''

            // Extract text from each slide
            slideFiles.forEach((fileName, index) => {
                const content = zip.file(fileName)?.asText()
                if (content) {
                    // Extract text content from <a:t> tags
                    // Simple regex approach - sufficient for text extraction
                    const textMatches = content.match(/<a:t.*?>(.*?)<\/a:t>/g)

                    if (textMatches) {
                        const slideText = textMatches
                            .map(tag => tag.replace(/<\/?a:t.*?>/g, ''))
                            .join(' ')

                        if (slideText.trim()) {
                            structuredText += `=== SLIDE ${index + 1} ===\n${slideText.trim()}\n\n`
                        }
                    }
                }
            })

            if (!structuredText) {
                throw new Error('No text content found in slides')
            }

            return NextResponse.json({ text: structuredText })

        } catch (extractError) {
            console.error('PizZip extraction failed, falling back to basic extraction:', extractError)
            // Fallback or re-throw
            throw new Error('Failed to parse PPTX structure')
        }

    } catch (error: any) {
        console.error('PPTX conversion error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to convert file' },
            { status: 500 }
        )
    }
}
