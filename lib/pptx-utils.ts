import PptxGenJS from 'pptxgenjs'

interface SlideContent {
    title: string
    content: string[]
    type: 'title' | 'content' | 'bullet' | 'section'
}

/**
 * Parse markdown content into slide-friendly structure
 */
function parseMarkdownToSlides(markdown: string): SlideContent[] {
    const slides: SlideContent[] = []
    const lines = markdown.split('\n')

    let currentSlide: SlideContent | null = null
    let contentBuffer: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Skip empty lines at the start of content
        if (!line && contentBuffer.length === 0) continue

        // H1 - Title slide
        if (line.startsWith('# ') && !line.startsWith('## ')) {
            if (currentSlide) {
                currentSlide.content = contentBuffer
                slides.push(currentSlide)
                contentBuffer = []
            }
            currentSlide = {
                title: line.replace('# ', ''),
                content: [],
                type: 'title'
            }
        }
        // H2 - Section header or content slide
        else if (line.startsWith('## ')) {
            if (currentSlide) {
                currentSlide.content = contentBuffer
                slides.push(currentSlide)
                contentBuffer = []
            }
            currentSlide = {
                title: line.replace('## ', ''),
                content: [],
                type: 'section'
            }
        }
        // H3 - Content slide
        else if (line.startsWith('### ')) {
            if (currentSlide) {
                currentSlide.content = contentBuffer
                slides.push(currentSlide)
                contentBuffer = []
            }
            currentSlide = {
                title: line.replace('### ', ''),
                content: [],
                type: 'content'
            }
        }
        // Bullet points
        else if (line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\. /)) {
            const bulletContent = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
            contentBuffer.push(bulletContent)
            if (currentSlide) {
                currentSlide.type = 'bullet'
            }
        }
        // Regular content
        else if (line && currentSlide) {
            // Clean up bold/italic markdown
            const cleanLine = line
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/__([^_]+)__/g, '$1')
                .replace(/_([^_]+)_/g, '$1')
                .replace(/`([^`]+)`/g, '$1')

            if (cleanLine) {
                contentBuffer.push(cleanLine)
            }
        }
    }

    // Don't forget the last slide
    if (currentSlide) {
        currentSlide.content = contentBuffer
        slides.push(currentSlide)
    }

    return slides
}

/**
 * Create a professional color scheme
 */
const theme = {
    primary: '7C3AED',      // Purple
    secondary: '6366F1',    // Indigo
    accent: 'EC4899',       // Pink
    background: 'FFFFFF',
    backgroundAlt: 'F8FAFC',
    text: '1E293B',
    textLight: '64748B',
    textWhite: 'FFFFFF',
}

/**
 * Convert markdown to a PowerPoint presentation
 */
export async function markdownToPptx(markdown: string, title: string = 'Presentation'): Promise<Buffer> {
    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = 'ProdInt AI'
    pptx.title = title
    pptx.subject = 'AI-Generated Presentation'
    pptx.company = 'ProdInt'

    // Define slide master with professional design
    pptx.defineSlideMaster({
        title: 'TITLE_SLIDE',
        background: { color: theme.primary },
        objects: [
            // Decorative element
            { rect: { x: 0, y: 4.5, w: 10, h: 1, fill: { color: theme.secondary } } },
        ],
    })

    pptx.defineSlideMaster({
        title: 'SECTION_SLIDE',
        background: { color: theme.secondary },
        objects: [
            { rect: { x: 0, y: 4.8, w: 10, h: 0.8, fill: { color: theme.accent } } },
        ],
    })

    pptx.defineSlideMaster({
        title: 'CONTENT_SLIDE',
        background: { color: theme.background },
        objects: [
            // Header bar
            { rect: { x: 0, y: 0, w: 10, h: 0.8, fill: { color: theme.primary } } },
            // Footer
            { rect: { x: 0, y: 5.3, w: 10, h: 0.2, fill: { color: theme.secondary } } },
        ],
    })

    // Parse markdown into slides
    const slides = parseMarkdownToSlides(markdown)

    // If no slides parsed, create a simple presentation
    if (slides.length === 0) {
        const slide = pptx.addSlide({ masterName: 'TITLE_SLIDE' })
        slide.addText(title, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 1.5,
            fontSize: 44,
            bold: true,
            color: theme.textWhite,
            align: 'center',
        })
        slide.addText('Generated with ProdInt AI', {
            x: 0.5,
            y: 3.5,
            w: 9,
            h: 0.5,
            fontSize: 18,
            color: theme.textWhite,
            align: 'center',
        })
    } else {
        // Create slides from parsed content
        slides.forEach((slideContent, index) => {
            let slide: PptxGenJS.Slide

            switch (slideContent.type) {
                case 'title':
                    slide = pptx.addSlide({ masterName: 'TITLE_SLIDE' })
                    slide.addText(slideContent.title, {
                        x: 0.5,
                        y: 1.8,
                        w: 9,
                        h: 1.5,
                        fontSize: 44,
                        bold: true,
                        color: theme.textWhite,
                        align: 'center',
                    })
                    if (slideContent.content.length > 0) {
                        slide.addText(slideContent.content.join(' '), {
                            x: 0.5,
                            y: 3.3,
                            w: 9,
                            h: 1,
                            fontSize: 20,
                            color: theme.textWhite,
                            align: 'center',
                        })
                    }
                    break

                case 'section':
                    slide = pptx.addSlide({ masterName: 'SECTION_SLIDE' })
                    slide.addText(slideContent.title, {
                        x: 0.5,
                        y: 2,
                        w: 9,
                        h: 1.2,
                        fontSize: 36,
                        bold: true,
                        color: theme.textWhite,
                        align: 'center',
                    })
                    if (slideContent.content.length > 0) {
                        slide.addText(slideContent.content.slice(0, 3).join(' • '), {
                            x: 0.5,
                            y: 3.2,
                            w: 9,
                            h: 1,
                            fontSize: 18,
                            color: theme.textWhite,
                            align: 'center',
                        })
                    }
                    break

                case 'bullet':
                case 'content':
                default:
                    slide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })

                    // Title
                    slide.addText(slideContent.title, {
                        x: 0.5,
                        y: 0.15,
                        w: 9,
                        h: 0.5,
                        fontSize: 20,
                        bold: true,
                        color: theme.textWhite,
                    })

                    // Content - bullets or text
                    if (slideContent.content.length > 0) {
                        const bullets = slideContent.content.map(text => ({
                            text: text,
                            options: {
                                fontSize: 16,
                                color: theme.text,
                                bullet: { type: 'bullet' as const, color: theme.primary },
                                paraSpaceAfter: 8,
                            },
                        }))

                        slide.addText(bullets, {
                            x: 0.5,
                            y: 1.1,
                            w: 9,
                            h: 4,
                            valign: 'top',
                        })
                    }
                    break
            }

            // Add slide number (except for title slide)
            if (slideContent.type !== 'title') {
                slide.addText(`${index + 1}`, {
                    x: 9.2,
                    y: 5.35,
                    w: 0.5,
                    h: 0.2,
                    fontSize: 10,
                    color: theme.textWhite,
                    align: 'right',
                })
            }
        })
    }

    // Generate the PPTX as a Buffer
    const data = await pptx.write({ outputType: 'nodebuffer' })
    return data as Buffer
}

/**
 * Extract key points from text for slide bullets
 */
export function extractKeyPoints(text: string, maxPoints: number = 5): string[] {
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 200)

    return sentences.slice(0, maxPoints)
}
