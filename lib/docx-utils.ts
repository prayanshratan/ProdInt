import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Packer,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  UnderlineType
} from 'docx'
import mammoth from 'mammoth'

/**
 * Parse inline markdown formatting (bold, italic, code, links, strikethrough)
 */
function parseInlineFormatting(text: string): TextRun[] {
  if (!text || text.trim() === '') {
    return [new TextRun({ text })]
  }

  const runs: TextRun[] = []
  let currentIndex = 0
  
  // Combined pattern to match all inline formats
  // Order is important: longer patterns first
  const pattern = /(\*\*\*[^*]+\*\*\*|___[^_]+___|~~[^~]+~~|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[([^\]]+)\]\(([^)]+)\))/g
  
  let match
  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      const beforeText = text.substring(currentIndex, match.index)
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText }))
      }
    }
    
    const fullMatch = match[0]
    let content = ''
    const runOptions: any = {}
    
    // Check what type of formatting this is
    if (fullMatch.startsWith('***') && fullMatch.endsWith('***')) {
      // Bold + Italic
      content = fullMatch.substring(3, fullMatch.length - 3)
      runOptions.bold = true
      runOptions.italics = true
    } else if (fullMatch.startsWith('___') && fullMatch.endsWith('___')) {
      // Bold + Italic (alternative)
      content = fullMatch.substring(3, fullMatch.length - 3)
      runOptions.bold = true
      runOptions.italics = true
    } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
      // Strikethrough
      content = fullMatch.substring(2, fullMatch.length - 2)
      runOptions.strike = true
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Bold
      content = fullMatch.substring(2, fullMatch.length - 2)
      runOptions.bold = true
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      // Bold (alternative)
      content = fullMatch.substring(2, fullMatch.length - 2)
      runOptions.bold = true
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      // Inline code
      content = fullMatch.substring(1, fullMatch.length - 1)
      runOptions.font = 'Courier New'
      runOptions.shading = { fill: 'f5f5f5' }
      runOptions.size = 20
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      // Italic
      content = fullMatch.substring(1, fullMatch.length - 1)
      runOptions.italics = true
    } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
      // Italic (alternative)
      content = fullMatch.substring(1, fullMatch.length - 1)
      runOptions.italics = true
    } else if (fullMatch.startsWith('[') && fullMatch.includes('](')) {
      // Link [text](url)
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        content = linkMatch[1]
        runOptions.color = '0000FF'
        runOptions.underline = { type: UnderlineType.SINGLE }
      }
    }
    
    if (content) {
      runOptions.text = content
      runs.push(new TextRun(runOptions))
    }
    
    currentIndex = match.index + fullMatch.length
  }
  
  // Add any remaining text after the last match
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex)
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText }))
    }
  }
  
  // If no formatting was found, return the original text
  return runs.length > 0 ? runs : [new TextRun({ text })]
}

/**
 * Check if content is HTML or Markdown
 */
function isHtmlContent(content: string): boolean {
  // Check for common HTML tags
  return /<[a-z][\s\S]*>/i.test(content)
}

/**
 * Convert HTML content to docx format
 */
async function htmlToDocx(html: string, title: string): Promise<Buffer> {
  // Convert HTML to markdown first, then use markdown to docx
  const markdown = htmlToMarkdown(html)
  return markdownToDocxInternal(markdown, title)
}

/**
 * Main conversion function that handles both HTML and Markdown
 */
export async function markdownToDocx(content: string, title: string): Promise<Buffer> {
  // Detect if content is HTML or Markdown
  if (isHtmlContent(content)) {
    return htmlToDocx(content, title)
  } else {
    return markdownToDocxInternal(content, title)
  }
}

/**
 * Convert markdown content to docx format with proper formatting (internal function)
 */
async function markdownToDocxInternal(markdown: string, title: string): Promise<Buffer> {
  const lines = markdown.split('\n')
  const children: (Paragraph | Table)[] = []
  
  let i = 0
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  
  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBlockContent.join('\n'),
                font: 'Courier New',
                size: 20,
              }),
            ],
            spacing: { before: 200, after: 200 },
            shading: { fill: 'f5f5f5' },
          })
        )
        codeBlockContent = []
        inCodeBlock = false
      } else {
        // Start of code block
        inCodeBlock = true
      }
      i++
      continue
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line)
      i++
      continue
    }
    
    // Handle tables
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      
      const cells = trimmedLine
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
      
      // Skip separator rows (|---|---|, |:---|:---:|, etc.)
      // Check if this is a separator row (contains only dashes, colons, and spaces)
      const isSeparator = cells.every(cell => /^[-:\s]+$/.test(cell))
      
      if (!isSeparator && cells.length > 0) {
        tableRows.push(cells)
      }
      
      i++
      
      // Check if next line is still table
      if (i >= lines.length || !lines[i].trim().startsWith('|')) {
        // End of table, create table element
        if (tableRows.length > 0) {
          const tableRowElements = tableRows.map((cells, rowIndex) => {
            return new TableRow({
              children: cells.map(cellText => {
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: parseInlineFormatting(cellText),
                    }),
                  ],
                  shading: rowIndex === 0 ? { fill: 'e0e0e0' } : undefined,
                  width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
                  margins: {
                    top: 100,
                    bottom: 100,
                    left: 100,
                    right: 100,
                  },
                })
              }),
            })
          })
          
          children.push(
            new Table({
              rows: tableRowElements,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              },
            })
          )
          children.push(new Paragraph({ text: '' }))
        }
        inTable = false
        tableRows = []
      }
      continue
    }
    
    // Headings
    if (trimmedLine.startsWith('##### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(6)),
          heading: HeadingLevel.HEADING_5,
          spacing: { before: 120, after: 60 },
        })
      )
    } else if (trimmedLine.startsWith('#### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(5)),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 150, after: 75 },
        })
      )
    } else if (trimmedLine.startsWith('### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(4)),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      )
    } else if (trimmedLine.startsWith('## ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(3)),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      )
    } else if (trimmedLine.startsWith('# ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(2)),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
    }
    // Horizontal rule
    else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          },
          spacing: { before: 200, after: 200 },
        })
      )
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const match = trimmedLine.match(/^(\d+)\.\s(.*)$/)
      if (match) {
        const level = (line.length - line.trimStart().length) / 2
        children.push(
          new Paragraph({
            children: parseInlineFormatting(match[2]),
            numbering: { reference: 'default-numbering', level: Math.floor(level) },
            spacing: { before: 100, after: 100 },
          })
        )
      }
    }
    // Bullet lists
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
      const level = (line.length - line.trimStart().length) / 2
      children.push(
        new Paragraph({
          children: parseInlineFormatting(trimmedLine.substring(2)),
          bullet: { level: Math.floor(level) },
          spacing: { before: 100, after: 100 },
        })
      )
    }
    // Empty lines
    else if (trimmedLine === '') {
      children.push(new Paragraph({ text: '' }))
    }
    // Regular paragraphs
    else {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          spacing: { before: 100, after: 100 },
        })
      )
    }
    
    i++
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
            {
              level: 1,
              format: 'decimal',
              text: '%2.',
              alignment: AlignmentType.LEFT,
            },
            {
              level: 2,
              format: 'decimal',
              text: '%3.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

/**
 * Convert HTML to Markdown with formatting preserved
 */
function htmlToMarkdown(html: string): string {
  let markdown = html
  
  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')
  
  // Convert bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  
  // Convert italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
  
  // Convert underline (not standard markdown, but we can use bold)
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '**$1**')
  
  // Convert strikethrough
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
  markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')
  markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
  
  // Convert code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  
  // Convert links
  markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  
  // Convert lists - unordered
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n')
  markdown = markdown.replace(/<\/ul>/gi, '\n')
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
  
  // Convert lists - ordered (simplified - all items get numbered)
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n')
  markdown = markdown.replace(/<\/ol>/gi, '\n')
  
  // Convert tables
  markdown = markdown.replace(/<table[^>]*>/gi, '\n')
  markdown = markdown.replace(/<\/table>/gi, '\n')
  markdown = markdown.replace(/<thead[^>]*>/gi, '')
  markdown = markdown.replace(/<\/thead>/gi, '')
  markdown = markdown.replace(/<tbody[^>]*>/gi, '')
  markdown = markdown.replace(/<\/tbody>/gi, '')
  
  // Convert table rows and cells
  let tableRows: string[] = []
  const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gis
  let rowMatch
  
  while ((rowMatch = tableRowRegex.exec(markdown)) !== null) {
    const rowContent = rowMatch[1]
    const cells: string[] = []
    const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gi
    let cellMatch
    
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[1].trim())
    }
    
    if (cells.length > 0) {
      tableRows.push('| ' + cells.join(' | ') + ' |')
    }
  }
  
  // Remove original table tags and insert markdown table
  markdown = markdown.replace(/<tr[^>]*>.*?<\/tr>/gis, '')
  
  if (tableRows.length > 0) {
    const separator = '|' + ' --- |'.repeat(tableRows[0].split('|').length - 2)
    tableRows.splice(1, 0, separator)
    markdown = markdown.replace(/<table[^>]*>.*?<\/table>/gis, '\n' + tableRows.join('\n') + '\n')
  }
  
  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
  
  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n')
  
  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n')
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '')
  
  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ')
  markdown = markdown.replace(/&amp;/g, '&')
  markdown = markdown.replace(/&lt;/g, '<')
  markdown = markdown.replace(/&gt;/g, '>')
  markdown = markdown.replace(/&quot;/g, '"')
  markdown = markdown.replace(/&#39;/g, "'")
  
  // Clean up extra whitespace and newlines
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n')
  markdown = markdown.trim()
  
  return markdown
}

/**
 * Convert docx file to HTML with formatting preserved
 */
export async function docxToText(buffer: Buffer): Promise<string> {
  try {
    // Convert DOCX to HTML with all formatting preserved
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
      convertImage: mammoth.images.imgElement((image) => {
        return image.read("base64").then((imageBuffer) => {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          }
        })
      })
    })
    
    // Return HTML directly - preserves all formatting
    return result.value
  } catch (error) {
    console.error('Error converting docx to HTML:', error)
    throw new Error('Failed to convert docx file')
  }
}

/**
 * Convert docx file to markdown (same as docxToText now)
 */
export async function docxToMarkdown(buffer: Buffer): Promise<string> {
  return docxToText(buffer)
}

/**
 * Convert HTML content to Markdown for MD downloads
 */
export function htmlContentToMarkdown(content: string): string {
  if (isHtmlContent(content)) {
    return htmlToMarkdown(content)
  }
  return content
}

