'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { FolderOpen, Plus, Download, Trash2, Star, Loader2, FileText, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// Helper component to render template content as a proper document
function TemplateDocumentRenderer({ content }: { content: string }) {
  // Check if content is HTML (contains HTML tags)
  const isHTML = /<[^>]+>/g.test(content)

  if (isHTML) {
    // Parse HTML content and render as clean document
    return <HTMLDocumentRenderer htmlContent={content} />
  } else {
    // Parse Markdown content and render as clean document
    return <MarkdownDocumentRenderer markdownContent={content} />
  }
}

// Render HTML content as a clean document
function HTMLDocumentRenderer({ htmlContent }: { htmlContent: string }) {
  // Create a temporary DOM element to parse HTML
  const parseHTMLToElements = (html: string) => {
    // Remove script tags for safety
    const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // Parse and extract text content with structure
    const parser = new DOMParser()
    const doc = parser.parseFromString(cleanHtml, 'text/html')

    const elements: React.ReactNode[] = []
    let key = 0

    const processNode = (node: Node): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) return text
        return null
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const tagName = element.tagName.toLowerCase()
        const childNodes = Array.from(element.childNodes)
        const children = childNodes.map(child => processNode(child)).filter(Boolean)

        switch (tagName) {
          case 'h1':
            return <h1 key={key++} className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border first:mt-0">{children}</h1>
          case 'h2':
            return <h2 key={key++} className="text-xl font-semibold text-foreground mt-6 mb-3">{children}</h2>
          case 'h3':
            return <h3 key={key++} className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h3>
          case 'h4':
            return <h4 key={key++} className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h4>
          case 'h5':
          case 'h6':
            return <h5 key={key++} className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h5>
          case 'p':
            if (children.length === 0) return null
            return <p key={key++} className="text-sm text-foreground leading-relaxed mb-3">{children}</p>
          case 'ul':
            return <ul key={key++} className="list-disc list-outside ml-5 mb-4 space-y-1 text-sm">{children}</ul>
          case 'ol':
            return <ol key={key++} className="list-decimal list-outside ml-5 mb-4 space-y-1 text-sm">{children}</ol>
          case 'li':
            return <li key={key++} className="leading-relaxed">{children}</li>
          case 'strong':
          case 'b':
            return <strong key={key++} className="font-semibold">{children}</strong>
          case 'em':
          case 'i':
            return <em key={key++} className="italic">{children}</em>
          case 'a':
            return <span key={key++} className="text-primary">{children}</span>
          case 'br':
            return <br key={key++} />
          case 'table':
            return (
              <div key={key++} className="overflow-x-auto mb-4 rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">{children}</table>
              </div>
            )
          case 'thead':
            return <thead key={key++} className="bg-muted/50">{children}</thead>
          case 'tbody':
            return <tbody key={key++} className="divide-y divide-border">{children}</tbody>
          case 'tr':
            return <tr key={key++} className="hover:bg-muted/30">{children}</tr>
          case 'th':
            return <th key={key++} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{children}</th>
          case 'td':
            return <td key={key++} className="px-4 py-2 text-sm">{children}</td>
          case 'blockquote':
            return <blockquote key={key++} className="border-l-4 border-primary/30 bg-muted/30 pl-4 pr-3 py-2 my-4 rounded-r-lg text-sm">{children}</blockquote>
          case 'hr':
            return <hr key={key++} className="my-6 border-t border-border" />
          case 'div':
          case 'span':
          case 'section':
          case 'article':
            if (children.length === 0) return null
            return <div key={key++}>{children}</div>
          default:
            if (children.length === 0) return null
            return <span key={key++}>{children}</span>
        }
      }

      return null
    }

    const bodyChildren = Array.from(doc.body.childNodes)
    bodyChildren.forEach(node => {
      const element = processNode(node)
      if (element) elements.push(element)
    })

    return elements
  }

  return <div className="space-y-1">{parseHTMLToElements(htmlContent)}</div>
}

// Render Markdown content as a clean document
function MarkdownDocumentRenderer({ markdownContent }: { markdownContent: string }) {
  const parseMarkdownToElements = (markdown: string) => {
    const lines = markdown.split('\n')
    const elements: React.ReactNode[] = []
    let key = 0
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol'
        const listClass = currentList.type === 'ul' ? 'list-disc' : 'list-decimal'
        elements.push(
          <ListTag key={key++} className={`${listClass} list-outside ml-5 mb-4 space-y-1 text-sm`}>
            {currentList.items.map((item, i) => (
              <li key={i} className="leading-relaxed">{item}</li>
            ))}
          </ListTag>
        )
        currentList = null
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // Skip empty lines
      if (!trimmedLine) {
        flushList()
        continue
      }

      // Headers
      if (trimmedLine.startsWith('######')) {
        flushList()
        const text = trimmedLine.replace(/^######\s*/, '')
        elements.push(<h6 key={key++} className="text-sm font-medium text-muted-foreground mt-3 mb-1.5">{text}</h6>)
      } else if (trimmedLine.startsWith('#####')) {
        flushList()
        const text = trimmedLine.replace(/^#####\s*/, '')
        elements.push(<h5 key={key++} className="text-sm font-semibold text-foreground mt-3 mb-1.5">{text}</h5>)
      } else if (trimmedLine.startsWith('####')) {
        flushList()
        const text = trimmedLine.replace(/^####\s*/, '')
        elements.push(<h4 key={key++} className="text-base font-semibold text-foreground mt-4 mb-2">{text}</h4>)
      } else if (trimmedLine.startsWith('###')) {
        flushList()
        const text = trimmedLine.replace(/^###\s*/, '')
        elements.push(<h3 key={key++} className="text-lg font-semibold text-foreground mt-5 mb-2">{text}</h3>)
      } else if (trimmedLine.startsWith('##')) {
        flushList()
        const text = trimmedLine.replace(/^##\s*/, '')
        elements.push(<h2 key={key++} className="text-xl font-semibold text-foreground mt-6 mb-3 pb-1 border-b border-border">{text}</h2>)
      } else if (trimmedLine.startsWith('#')) {
        flushList()
        const text = trimmedLine.replace(/^#\s*/, '')
        elements.push(<h1 key={key++} className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border first:mt-0">{text}</h1>)
      }
      // Unordered list items
      else if (trimmedLine.match(/^[-*+]\s/)) {
        const text = trimmedLine.replace(/^[-*+]\s/, '')
        if (!currentList || currentList.type !== 'ul') {
          flushList()
          currentList = { type: 'ul', items: [] }
        }
        currentList.items.push(text)
      }
      // Ordered list items
      else if (trimmedLine.match(/^\d+\.\s/)) {
        const text = trimmedLine.replace(/^\d+\.\s/, '')
        if (!currentList || currentList.type !== 'ol') {
          flushList()
          currentList = { type: 'ol', items: [] }
        }
        currentList.items.push(text)
      }
      // Horizontal rule
      else if (trimmedLine.match(/^[-*_]{3,}$/)) {
        flushList()
        elements.push(<hr key={key++} className="my-6 border-t border-border" />)
      }
      // Blockquote
      else if (trimmedLine.startsWith('>')) {
        flushList()
        const text = trimmedLine.replace(/^>\s*/, '')
        elements.push(
          <blockquote key={key++} className="border-l-4 border-primary/30 bg-muted/30 pl-4 pr-3 py-2 my-4 rounded-r-lg text-sm">
            {text}
          </blockquote>
        )
      }
      // Regular paragraph
      else {
        flushList()
        // Process inline formatting
        let processedText: React.ReactNode = trimmedLine

        // Remove inline markdown symbols but keep the text
        const cleanText = trimmedLine
          .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
          .replace(/\*([^*]+)\*/g, '$1')       // Italic
          .replace(/__([^_]+)__/g, '$1')       // Bold
          .replace(/_([^_]+)_/g, '$1')         // Italic
          .replace(/`([^`]+)`/g, '$1')         // Code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links

        elements.push(<p key={key++} className="text-sm text-foreground leading-relaxed mb-3">{cleanText}</p>)
      }
    }

    flushList()
    return elements
  }

  return <div className="space-y-1">{parseMarkdownToElements(markdownContent)}</div>
}

// Helper function to get clean text for card preview
function getCleanPreviewText(content: string): string {
  let cleanText = content

  // Remove HTML tags
  cleanText = cleanText.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  cleanText = cleanText
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Remove markdown headers
  cleanText = cleanText.replace(/^#{1,6}\s*/gm, '')

  // Remove markdown bold/italic
  cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1')
  cleanText = cleanText.replace(/\*([^*]+)\*/g, '$1')
  cleanText = cleanText.replace(/__([^_]+)__/g, '$1')
  cleanText = cleanText.replace(/_([^_]+)_/g, '$1')

  // Remove markdown links
  cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove markdown code
  cleanText = cleanText.replace(/`([^`]+)`/g, '$1')

  // Remove markdown list markers
  cleanText = cleanText.replace(/^[-*+]\s/gm, '')
  cleanText = cleanText.replace(/^\d+\.\s/gm, '')

  // Remove markdown horizontal rules
  cleanText = cleanText.replace(/^[-*_]{3,}$/gm, '')

  // Remove pipe characters (table separators)
  cleanText = cleanText.replace(/\|/g, ' ')

  // Remove excessive whitespace and newlines
  cleanText = cleanText.replace(/\s+/g, ' ').trim()

  return cleanText
}

export default function TemplatesPage() {
  const { toast } = useToast()

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null)

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch templates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast({ title: 'Error', description: 'Name and content are required', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })

      const data = await res.json()
      if (data.template) {
        // Refetch all templates to ensure correct default status
        await fetchTemplates()
        setShowNewDialog(false)
        setNewTemplate({ name: '', content: '' })
        toast({ title: 'Success', description: 'Template created successfully' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const setAsDefault = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (res.ok) {
        await fetchTemplates()
        toast({ title: 'Success', description: 'Default template updated' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' })
    }
  }

  const confirmDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId)
    setShowDeleteDialog(true)
  }

  const deleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      const res = await fetch(`/api/templates/${templateToDelete}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== templateToDelete))
        toast({ title: 'Success', description: 'Template deleted' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' })
    } finally {
      setShowDeleteDialog(false)
      setTemplateToDelete(null)
    }
  }

  const downloadTemplate = async (template: any, format: 'md' | 'docx' = 'md') => {
    if (format === 'docx') {
      try {
        const res = await fetch('/api/convert/markdown-to-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: template.content,
            title: template.name,
          }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${template.name}.docx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({ title: 'Success', description: 'Template downloaded as DOCX' })
        } else {
          toast({ title: 'Error', description: 'Failed to convert template', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' })
      }
    } else {
      const blob = new Blob([template.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: 'Success', description: 'Template downloaded' })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.name.endsWith('.docx')) {
      // Convert docx to text
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/convert/docx-to-text', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (data.text) {
          setNewTemplate({
            name: file.name.replace(/\.(md|txt|docx)$/, ''),
            content: data.text,
          })
          setShowNewDialog(true)
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to process file', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' })
      }
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setNewTemplate({
          name: file.name.replace(/\.(md|txt|docx)$/, ''),
          content,
        })
        setShowNewDialog(true)
      }
      reader.readAsText(file)
    }

    event.target.value = '' // Reset input
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
            <FolderOpen className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground text-lg">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">PRD Templates</h1>
          <p className="text-muted-foreground text-xl">
            Manage your custom templates and set defaults
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".md,.txt,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => setShowNewDialog(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="border-0 shadow-enterprise bg-card">
          <CardContent className="p-16 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mx-auto">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">No templates yet</h3>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Create your first template to get started
              </p>
            </div>
            <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="group relative hover-lift border-0 shadow-enterprise bg-card overflow-hidden">
              {template.isDefault && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center shadow-sm">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Default
                  </div>
                </div>
              )}
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="pr-20 text-xl">{template.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm">
                  {template.userId === 'system' ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      System Template
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                      System Template
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {getCleanPreviewText(template.content).substring(0, 150)}...
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(template, 'md')}
                    className="shadow-sm"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    MD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(template, 'docx')}
                    className="shadow-sm"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                    className="shadow-sm hover:bg-primary hover:text-white hover:border-primary"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    View
                  </Button>
                  <Button
                    variant={template.isDefault ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAsDefault(template.id)}
                    className="shadow-sm"
                  >
                    <Star className={`h-3 w-3 mr-1.5 ${template.isDefault ? 'fill-current' : ''}`} />
                    {template.isDefault ? 'Default' : 'Set Default'}
                  </Button>
                  {template.name !== 'Comprehensive PRD Template' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmDeleteTemplate(template.id)}
                      className="shadow-sm hover:bg-destructive hover:text-white hover:border-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a custom PRD template for your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                placeholder="e.g., Enterprise PRD Template"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">
                Template Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="template-content"
                placeholder="Paste your template content here..."
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                rows={20}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewDialog(false)
                  setNewTemplate({ name: '', content: '' })
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={createTemplate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="space-y-1 pr-8">
                <DialogTitle className="text-xl font-semibold">{previewTemplate?.name}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Template Preview
                </DialogDescription>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-background">
              <div className="max-w-3xl mx-auto bg-card rounded-lg shadow-lg border p-8 md:p-12">
                {/* Document-style rendering */}
                <div className="prose prose-sm max-w-none document-preview">
                  {previewTemplate && (
                    <TemplateDocumentRenderer content={previewTemplate.content} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

