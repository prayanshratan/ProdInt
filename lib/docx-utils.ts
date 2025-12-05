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
import HTMLtoDOCX from 'html-to-docx'

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
 * Uses internal docx generation for reliable formatting
 */
export async function markdownToDocx(content: string, title: string): Promise<Buffer> {
  try {
    // Detect if content is HTML or Markdown
    if (isHtmlContent(content)) {
      // Convert HTML to markdown first, then to DOCX
      const markdown = htmlToMarkdown(content)
      return markdownToDocxInternal(markdown, title)
    } else {
      // Use internal DOCX generation directly for markdown
      // This provides much better list formatting than html-to-docx
      return markdownToDocxInternal(content, title)
    }
  } catch (error) {
    console.error('Error in markdownToDocx:', error)
    throw error
  }
}

/**
 * Advanced HTML to DOCX conversion using html-to-docx library
 * This preserves fonts, colors, tables, images, and all formatting
 */
async function htmlToDocxAdvanced(html: string, title: string): Promise<Buffer> {
  try {
    const buffer = await HTMLtoDOCX(html, null, {
      title: title,
      subject: title,
      creator: 'ProdInt',
      keywords: ['PRD', 'Product Requirements', 'Document'],
      description: `Product Requirements Document: ${title}`,
      font: 'Arial', // Default font, HTML styles will override
      fontSize: 22, // 11pt default
      margins: {
        top: 1440, // 1 inch
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
      orientation: 'portrait',
      table: {
        row: {
          cantSplit: false
        }
      }
    })
    
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Error in htmlToDocxAdvanced:', error)
    throw error
  }
}

/**
 * Convert Markdown to HTML while preserving structure
 * Enhanced to handle complex markdown better
 */
function markdownToHtml(markdown: string): string {
  let html = markdown
  
  // First, protect code blocks from being processed
  const codeBlocks: string[] = []
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(code)
    return `<<<CODE_BLOCK_${codeBlocks.length - 1}>>>`
  })
  
  // Convert headings FIRST (must be done before other conversions)
  html = html.replace(/^###### (.+)$/gm, '<h6 style="font-size: 12px; font-weight: bold; margin: 8px 0;">$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5 style="font-size: 14px; font-weight: bold; margin: 10px 0;">$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size: 16px; font-weight: bold; margin: 12px 0;">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 14px 0;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 22px; font-weight: bold; margin: 16px 0;">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 26px; font-weight: bold; margin: 18px 0;">$1</h1>')
  
  // Convert tables BEFORE inline formatting (before other conversions)
  const tableRegex = /\n?\|(.+)\|[\r\n]+\|[-:| ]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/g
  html = html.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim()).map((cell: string) => cell.trim())
    const bodyRows = body.trim().split('\n').filter((r: string) => r.trim()).map((row: string) => 
      row.split('|').filter((c: string) => c.trim()).slice(0, headerCells.length).map((cell: string) => cell.trim())
    )
    
    let table = '\n<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">\n'
    table += '  <thead>\n    <tr style="background-color: #f2f2f2;">\n'
    headerCells.forEach((cell: string) => {
      table += `      <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">${cell}</th>\n`
    })
    table += '    </tr>\n  </thead>\n'
    table += '  <tbody>\n'
    bodyRows.forEach((row: string[], idx: number) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9f9f9'
      table += `    <tr style="background-color: ${bgColor};">\n`
      row.forEach((cell: string) => {
        table += `      <td style="padding: 10px; border: 1px solid #ddd;">${cell}</td>\n`
      })
      table += '    </tr>\n'
    })
    table += '  </tbody>\n</table>\n'
    
    return table
  })
  
  // Convert horizontal rules BEFORE list processing
  html = html.replace(/^---+$/gm, '<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">')
  html = html.replace(/^\*\*\*+$/gm, '<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">')
  
  // Convert LISTS BEFORE inline formatting (critical fix!)
  // This ensures bullet points like "* **Bold text**" are detected as lists first
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inUnorderedList = false
  let inOrderedList = false
  let currentIndent = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Skip empty lines but track list state
    if (trimmedLine === '') {
      if (inUnorderedList) {
        processedLines.push('</ul>')
        inUnorderedList = false
      }
      if (inOrderedList) {
        processedLines.push('</ol>')
        inOrderedList = false
      }
      processedLines.push(line)
      continue
    }
    
    // Skip lines that are already HTML tags (headings, hr, etc.)
    if (trimmedLine.startsWith('<')) {
      if (inUnorderedList) {
        processedLines.push('</ul>')
        inUnorderedList = false
      }
      if (inOrderedList) {
        processedLines.push('</ol>')
        inOrderedList = false
      }
      processedLines.push(line)
      continue
    }
    
    // Check for unordered list (must match start of line, allowing leading whitespace for nesting)
    const unorderedMatch = line.match(/^(\s*)([\*\-\+])\s+(.+)$/)
    
    // Check for ordered list (only at start of line, not within content like "1. Cost of inaction:")
    // Only match if it's at the beginning of content (no leading text) and the number is reasonable (1-999)
    const orderedMatch = line.match(/^(\s*)(\d{1,3})\.\s+(.+)$/)
    
    if (unorderedMatch) {
      const [, indent, , content] = unorderedMatch
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push('</ol>')
          inOrderedList = false
        }
        processedLines.push('<ul style="margin: 10px 0; padding-left: 30px;">')
        inUnorderedList = true
      }
      // Apply inline formatting to the list item content
      const formattedContent = applyInlineFormatting(content)
      processedLines.push(`  <li style="margin: 5px 0;">${formattedContent}</li>`)
    } else if (orderedMatch) {
      const [, indent, num, content] = orderedMatch
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push('</ul>')
          inUnorderedList = false
        }
        processedLines.push('<ol style="margin: 10px 0; padding-left: 30px;">')
        inOrderedList = true
      }
      // Apply inline formatting to the list item content
      const formattedContent = applyInlineFormatting(content)
      processedLines.push(`  <li style="margin: 5px 0;">${formattedContent}</li>`)
    } else {
      // Not a list item - close any open lists
      if (inUnorderedList) {
        processedLines.push('</ul>')
        inUnorderedList = false
      }
      if (inOrderedList) {
        processedLines.push('</ol>')
        inOrderedList = false
      }
      // Apply inline formatting to regular content
      const formattedLine = applyInlineFormatting(line)
      processedLines.push(formattedLine)
    }
  }
  
  // Close any remaining open lists
  if (inUnorderedList) processedLines.push('</ul>')
  if (inOrderedList) processedLines.push('</ol>')
  
  html = processedLines.join('\n')
  
  // Restore code blocks with styling
  codeBlocks.forEach((code, index) => {
    html = html.replace(
      `<<<CODE_BLOCK_${index}>>>`,
      `<pre style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #ddd;"><code style="font-family: monospace; font-size: 13px;">${code.trim()}</code></pre>`
    )
  })
  
  // Convert paragraphs (lines that aren't already HTML tags)
  const finalLines = html.split('\n')
  html = finalLines.map(line => {
    const trimmed = line.trim()
    if (trimmed === '') return ''
    if (trimmed.startsWith('<') || line.includes('</') || (trimmed.includes('<') && trimmed.includes('>'))) return line
    return `<p style="margin: 10px 0; line-height: 1.6;">${line}</p>`
  }).join('\n')
  
  // Clean up excessive whitespace
  html = html.replace(/\n{3,}/g, '\n\n')
  html = html.replace(/<p[^>]*><\/p>/g, '')
  
  return html
}

/**
 * Apply inline markdown formatting (bold, italic, code, links, strikethrough)
 * Used by markdownToHtml to format content within list items and paragraphs
 */
function applyInlineFormatting(text: string): string {
  let result = text
  
  // Convert bold and italic (bold first to avoid conflicts)
  // Bold + Italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // Italic (be careful not to match list bullets)
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
  result = result.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
  
  // Convert strikethrough
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>')
  
  // Convert inline code
  result = result.replace(/`([^`]+?)`/g, '<code style="background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>')
  
  // Convert links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: underline;">$1</a>')
  
  return result
}

/**
 * Convert markdown content to docx format with proper formatting (internal function)
 */
async function markdownToDocxInternal(markdown: string, title: string): Promise<Buffer> {
  // Normalize line endings
  const normalizedMarkdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedMarkdown.split('\n')
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
    // Bullet lists - check BEFORE numbered lists to avoid conflicts
    // Match lines starting with -, *, or + followed by space
    else if (/^[\s]*[-*+]\s+/.test(line)) {
      const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/)
      if (bulletMatch) {
        const indent = bulletMatch[1].length
        const content = bulletMatch[3]
        const level = Math.floor(indent / 2)
        children.push(
          new Paragraph({
            children: parseInlineFormatting(content),
            bullet: { level: Math.min(level, 2) }, // Max 3 levels
            spacing: { before: 100, after: 100 },
          })
        )
      } else {
        // Fallback if regex doesn't match
        children.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine.substring(2)),
            bullet: { level: 0 },
            spacing: { before: 100, after: 100 },
          })
        )
      }
    }
    // Numbered lists - only match lines that are clearly ordered lists (at start of line)
    else if (/^[\s]*\d{1,3}\.\s+/.test(line)) {
      const numMatch = line.match(/^(\s*)(\d{1,3})\.\s+(.*)$/)
      if (numMatch) {
        const indent = numMatch[1].length
        const content = numMatch[3]
        const level = Math.floor(indent / 2)
        children.push(
          new Paragraph({
            children: parseInlineFormatting(content),
            numbering: { reference: 'default-numbering', level: Math.min(level, 2) },
            spacing: { before: 100, after: 100 },
          })
        )
      }
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
 * This preserves ALL formatting including fonts, colors, sizes, tables, images
 */
export async function docxToText(buffer: Buffer): Promise<string> {
  try {
    // Convert DOCX to HTML with all formatting preserved including inline styles
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
      ],
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      convertImage: mammoth.images.imgElement((image) => {
        return image.read("base64").then((imageBuffer) => {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          }
        })
      }),
      // Preserve as much formatting as possible
      preserveEmptyParagraphs: true,
    })
    
    // Add a wrapper to ensure proper document structure
    let html = result.value
    
    // If the HTML doesn't start with proper tags, wrap it
    if (!html.trim().startsWith('<')) {
      html = `<div>${html}</div>`
    }
    
    // Return HTML directly - preserves all formatting
    return html
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

