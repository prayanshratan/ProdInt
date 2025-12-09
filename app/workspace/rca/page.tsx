'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Send, Download, Loader2, Plus, Trash2, Copy, Check, User, Sparkles, FileText, ChevronRight, ChevronLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileUpload } from '@/components/FileUpload'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

type RCAOption = 'analysis' | 'user-facing' | 'technical'

interface NewChatForm {
  title: string
  errorLogs: string
  additionalContext: string
  rcaTypes: RCAOption[]
  customUserFacingTemplate: string
  customTechnicalTemplate: string
}

export default function RCAAgentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [currentChat, setCurrentChat] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Multi-step form state
  const [formStep, setFormStep] = useState(1)
  const [newChatForm, setNewChatForm] = useState<NewChatForm>({
    title: '',
    errorLogs: '',
    additionalContext: '',
    rcaTypes: ['analysis'],
    customUserFacingTemplate: '',
    customTechnicalTemplate: '',
  })

  const [message, setMessage] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      toast({ title: 'Copied to clipboard' })
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  // Parse major document sections from combined AI response
  // Only splits at top-level document headers, not internal --- separators
  const parseMessageSections = (content: string): { title: string; content: string }[] => {
    // Define the major section headers we want to split on
    const majorHeaders = [
      '# Error Analysis',
      '# User-Facing RCA',
      '# Technical Engineering RCA'
    ]

    // Find positions of major headers in the content
    const headerPositions: { header: string; index: number }[] = []
    for (const header of majorHeaders) {
      const index = content.indexOf(header)
      if (index !== -1) {
        headerPositions.push({ header, index })
      }
    }

    // If no major headers found or only one section, return as single section
    if (headerPositions.length <= 1) {
      const titleMatch = content.match(/^#\s+(.+?)(?:\n|$)/m)
      return [{
        title: titleMatch ? titleMatch[1] : 'Analysis',
        content: content.trim()
      }]
    }

    // Sort by position
    headerPositions.sort((a, b) => a.index - b.index)

    // Extract each section
    const sections: { title: string; content: string }[] = []
    for (let i = 0; i < headerPositions.length; i++) {
      const start = headerPositions[i].index
      const end = i < headerPositions.length - 1 ? headerPositions[i + 1].index : content.length

      let sectionContent = content.substring(start, end).trim()
      // Remove trailing --- separator if present
      sectionContent = sectionContent.replace(/\n---\s*$/, '').trim()

      const titleMatch = sectionContent.match(/^#\s+(.+?)(?:\n|$)/)
      const title = titleMatch ? titleMatch[1] : 'Section'

      sections.push({ title, content: sectionContent })
    }

    return sections.filter(section => section.content.length > 0)
  }

  // Strip conversational preamble from AI responses
  const stripPreamble = (content: string): string => {
    const headingMatch = content.match(/^(#{1,6}\s+.+)$/m)
    if (headingMatch && headingMatch.index !== undefined) {
      return content.substring(headingMatch.index).trim()
    }
    return content
  }

  const downloadSection = async (content: string, format: 'md' | 'docx' = 'md', sectionTitle: string) => {
    // Create filename from section title
    const sanitizedTitle = sectionTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')
    const filename = `${currentChat.title}-${sanitizedTitle}`
    const cleanContent = stripPreamble(content)

    if (format === 'docx') {
      try {
        const res = await fetch('/api/convert/markdown-to-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: cleanContent,
            title: filename,
          }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${filename}.docx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({ title: 'Success', description: 'RCA downloaded as DOCX' })
        } else {
          toast({ title: 'Error', description: 'Failed to convert to DOCX', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to download DOCX', variant: 'destructive' })
      }
    } else {
      const blob = new Blob([cleanContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: 'Success', description: 'RCA downloaded as Markdown' })
    }
  }

  // Keep legacy function for full message download
  const downloadFullMessage = async (content: string, format: 'md' | 'docx' = 'md', messageIndex: number) => {
    const filename = `${currentChat.title}-v${messageIndex + 1}`
    const cleanContent = stripPreamble(content)

    if (format === 'docx') {
      try {
        const res = await fetch('/api/convert/markdown-to-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: cleanContent,
            title: filename,
          }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${filename}.docx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({ title: 'Success', description: 'Downloaded as DOCX' })
        } else {
          toast({ title: 'Error', description: 'Failed to convert to DOCX', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to download DOCX', variant: 'destructive' })
      }
    } else {
      const blob = new Blob([cleanContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: 'Success', description: 'Downloaded as Markdown' })
    }
  }

  useEffect(() => {
    fetchChats()
  }, [])

  // Auto-select chat from query parameter
  useEffect(() => {
    const chatId = searchParams.get('chatId')
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId)
      if (chat) {
        setCurrentChat(chat)
        router.replace('/workspace/rca', { scroll: false })
      }
    }
  }, [searchParams, chats, router])

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats')
      const data = await res.json()
      if (data.chats) {
        const rcaChats = data.chats.filter((c: any) => c.type === 'rca')
        setChats(rcaChats)
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    }
  }

  const resetForm = () => {
    setNewChatForm({
      title: '',
      errorLogs: '',
      additionalContext: '',
      rcaTypes: ['analysis'],
      customUserFacingTemplate: '',
      customTechnicalTemplate: '',
    })
    setFormStep(1)
  }

  const getTotalSteps = () => {
    // Step 1: Title + Error Logs
    // Step 2: Additional Context  
    // Step 3: RCA Type Selection
    // Step 4: Custom Template (only if user-facing or technical RCA types selected)
    const needsTemplateStep = newChatForm.rcaTypes.includes('user-facing') || newChatForm.rcaTypes.includes('technical')
    return needsTemplateStep ? 4 : 3
  }

  const canProceedToNextStep = () => {
    switch (formStep) {
      case 1:
        return newChatForm.title.trim() && newChatForm.errorLogs.trim()
      case 2:
        return true // Additional context is optional
      case 3:
        return newChatForm.rcaTypes.length > 0
      case 4:
        return true // Custom template is optional
      default:
        return false
    }
  }

  const createNewChat = async () => {
    if (!newChatForm.title.trim() || !newChatForm.errorLogs.trim()) {
      toast({ title: 'Error', description: 'Please provide a title and error logs', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rca',
          title: newChatForm.title,
        }),
      })

      const data = await res.json()
      if (data.chat) {
        setCurrentChat(data.chat)
        setChats([data.chat, ...chats])
        setShowNewChatDialog(false)

        // Auto-generate RCA based on selected types
        await sendMessage(
          `Analyze the following error logs and generate ${getRCATypesLabel(newChatForm.rcaTypes)}`,
          data.chat.id
        )

        resetForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create analysis', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getRCATypesLabel = (types: RCAOption[]): string => {
    const labels: string[] = []
    if (types.includes('analysis')) labels.push('an error analysis')
    if (types.includes('user-facing')) labels.push('a user-facing RCA')
    if (types.includes('technical')) labels.push('a technical engineering RCA')

    if (labels.length === 0) return 'an analysis'
    if (labels.length === 1) return labels[0]
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
  }

  const sendMessage = async (msgText?: string, chatId?: string) => {
    const textToSend = msgText || message
    const targetChatId = chatId || currentChat?.id

    // Don't allow empty messages
    if (!textToSend.trim() || !targetChatId) {
      if (!msgText) {
        toast({ title: 'Error', description: 'Please enter a message', variant: 'destructive' })
      }
      return
    }

    setGenerating(true)
    setMessage('')

    try {
      const isInitialRequest = chatId && msgText // This is the auto-generated first message

      const res = await fetch('/api/ai/rca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          message: textToSend,
          ...(isInitialRequest && {
            errorLogs: newChatForm.errorLogs,
            additionalContext: newChatForm.additionalContext,
            rcaTypes: newChatForm.rcaTypes,
            customUserFacingTemplate: newChatForm.customUserFacingTemplate || null,
            customTechnicalTemplate: newChatForm.customTechnicalTemplate || null,
          }),
        }),
      })

      const data = await res.json()
      if (data.chat) {
        setCurrentChat(data.chat)
        const updatedChats = chats.map(c => c.id === data.chat.id ? data.chat : c)
        setChats(updatedChats)
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const confirmDeleteChat = (chatId: string) => {
    setChatToDelete(chatId)
    setShowDeleteDialog(true)
  }

  const deleteChat = async () => {
    if (!chatToDelete) return

    try {
      const res = await fetch(`/api/chats/${chatToDelete}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setChats(chats.filter(c => c.id !== chatToDelete))
        if (currentChat?.id === chatToDelete) {
          setCurrentChat(null)
        }
        toast({ title: 'Success', description: 'Analysis deleted successfully' })
      } else {
        toast({ title: 'Error', description: 'Failed to delete analysis', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete analysis', variant: 'destructive' })
    } finally {
      setShowDeleteDialog(false)
      setChatToDelete(null)
    }
  }

  const rcaTypeOptions: { value: RCAOption; label: string; description: string }[] = [
    { value: 'analysis', label: 'Error Analysis', description: 'Understand what went wrong and how to fix it' },
    { value: 'user-facing', label: 'User-Facing RCA', description: 'Customer-friendly incident report' },
    { value: 'technical', label: 'Technical RCA', description: 'Detailed engineering analysis' },
  ]

  const toggleRCAType = (value: RCAOption) => {
    const currentTypes = newChatForm.rcaTypes
    if (currentTypes.includes(value)) {
      // Remove if already selected (but keep at least one)
      if (currentTypes.length > 1) {
        setNewChatForm({ ...newChatForm, rcaTypes: currentTypes.filter(t => t !== value) })
      }
    } else {
      // Add if not selected
      setNewChatForm({ ...newChatForm, rcaTypes: [...currentTypes, value] })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">RCA Agent</h1>
          <p className="text-muted-foreground text-xl">
            Analyze errors and generate Root Cause Analysis documents
          </p>
        </div>
        <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="shadow-sm">
          <Plus className="h-5 w-5 mr-2" />
          New Analysis
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1 border-0 shadow-enterprise bg-card">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold">Your Analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {chats.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mx-auto">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No analyses yet</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group rounded-xl transition-all-smooth ${currentChat?.id === chat.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'hover:bg-muted/50 border border-border'
                    }`}
                >
                  <button
                    onClick={() => setCurrentChat(chat)}
                    className="w-full text-left p-3"
                  >
                    <p className="font-medium truncate text-sm pr-8">{chat.title}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmDeleteChat(chat.id)
                    }}
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive hover:text-white rounded-lg"
                    title="Delete Analysis"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 border-0 shadow-enterprise bg-card">
          {currentChat ? (
            <>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{currentChat.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {currentChat.messages.length} messages
                      {currentChat.rcaType && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {currentChat.rcaType}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-card">
                    {currentChat.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground space-y-4 max-w-md px-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 mx-auto">
                            <AlertTriangle className="h-8 w-8 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-foreground">Start the conversation</p>
                            <p className="text-sm">Ask me to analyze error logs or provide more context for the RCA.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto py-8 px-4">
                        {currentChat.messages.map((msg: any, idx: number) => {
                          const aiMessageIndex = currentChat.messages
                            .slice(0, idx + 1)
                            .filter((m: any) => m.role === 'assistant').length
                          const isRCAMessage = msg.role === 'assistant' && msg.content.length > 100

                          // Parse sections for AI messages with multiple parts
                          const sections = msg.role === 'assistant' ? parseMessageSections(msg.content) : []
                          const hasMultipleSections = sections.length > 1

                          return (
                            <div
                              key={idx}
                              className={`group flex gap-4 mb-8 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                }`}
                            >
                              {/* Avatar */}
                              <div className="flex-shrink-0">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${msg.role === 'user'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-gradient-to-br from-primary to-purple-600 text-white'
                                    }`}
                                >
                                  {msg.role === 'user' ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </div>
                              </div>

                              {/* Message Content */}
                              <div className={`flex-1 space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {msg.role === 'user' ? 'You' : 'ProdInt AI'}
                                  </span>
                                  {isRCAMessage && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                      v{aiMessageIndex}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                {/* Message Text - Handle multiple sections */}
                                {msg.role === 'assistant' && hasMultipleSections ? (
                                  <div className="space-y-6">
                                    {sections.map((section, sectionIdx) => {
                                      const sectionKey = `${idx}-${sectionIdx}`
                                      return (
                                        <div key={sectionIdx} className="border border-border rounded-xl overflow-hidden">
                                          {/* Section Content */}
                                          <div className="p-4 bg-card">
                                            <MarkdownRenderer content={section.content} />
                                          </div>

                                          {/* Section Action Bar */}
                                          <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t border-border">
                                            <span className="text-xs font-medium text-muted-foreground mr-2">
                                              {section.title}
                                            </span>
                                            <div className="flex-1" />
                                            <button
                                              onClick={() => copyToClipboard(section.content, sectionKey)}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                              title={`Copy ${section.title}`}
                                            >
                                              {copiedKey === sectionKey ? (
                                                <>
                                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                                  <span className="text-green-600">Copied</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Copy className="h-3.5 w-3.5" />
                                                  <span>Copy</span>
                                                </>
                                              )}
                                            </button>
                                            <div className="w-px h-4 bg-gray-300" />
                                            <button
                                              onClick={() => downloadSection(section.content, 'md', section.title)}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                              title="Download as Markdown"
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              <span>MD</span>
                                            </button>
                                            <button
                                              onClick={() => downloadSection(section.content, 'docx', section.title)}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                              title="Download as DOCX"
                                            >
                                              <FileText className="h-3.5 w-3.5" />
                                              <span>DOCX</span>
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Download All option */}
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                      <span className="text-xs text-muted-foreground">Download all:</span>
                                      <button
                                        onClick={() => copyToClipboard(msg.content, `${idx}-all`)}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                        title="Copy all sections"
                                      >
                                        {copiedKey === `${idx}-all` ? (
                                          <>
                                            <Check className="h-3.5 w-3.5 text-green-600" />
                                            <span className="text-green-600">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Copy All</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => downloadFullMessage(msg.content, 'md', aiMessageIndex)}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                        title="Download all as Markdown"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        <span>All MD</span>
                                      </button>
                                      <button
                                        onClick={() => downloadFullMessage(msg.content, 'docx', aiMessageIndex)}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                        title="Download all as DOCX"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>All DOCX</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Single section or user message */}
                                    <div className={`max-w-none ${msg.role === 'user' ? 'text-right' : ''}`}>
                                      {msg.role === 'assistant' ? (
                                        <MarkdownRenderer content={msg.content} />
                                      ) : (
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed m-0">
                                          {msg.content}
                                        </p>
                                      )}
                                    </div>

                                    {/* Single Action Bar for non-sectioned AI messages */}
                                    {msg.role === 'assistant' && (
                                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                                        <button
                                          onClick={() => copyToClipboard(msg.content, `${idx}`)}
                                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                          title="Copy message"
                                        >
                                          {copiedKey === `${idx}` ? (
                                            <>
                                              <Check className="h-3.5 w-3.5 text-green-600" />
                                              <span className="text-green-600">Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3.5 w-3.5" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>

                                        {isRCAMessage && (
                                          <>
                                            <div className="w-px h-4 bg-gray-200" />
                                            <button
                                              onClick={() => downloadFullMessage(msg.content, 'md', aiMessageIndex)}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
                                              title="Download as Markdown"
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              <span>MD</span>
                                            </button>
                                            <button
                                              onClick={() => downloadFullMessage(msg.content, 'docx', aiMessageIndex)}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                              title="Download as DOCX"
                                            >
                                              <FileText className="h-3.5 w-3.5" />
                                              <span>DOCX</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Loading State */}
                        {generating && (
                          <div className="flex gap-4 mb-8 animate-fade-in">
                            <div className="flex-shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 text-white">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <span className="text-sm font-semibold">ProdInt AI</span>
                              <div className="flex items-center gap-1 h-6">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="border-t bg-muted/30 p-4">
                    <div className="max-w-3xl mx-auto">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          sendMessage()
                        }}
                        className="flex gap-3 items-end"
                      >
                        <div className="flex-1 relative">
                          <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
                                e.preventDefault()
                                if (message.trim() && !generating) {
                                  sendMessage()
                                }
                              }
                            }}
                            placeholder="Ask for changes or provide more context..."
                            disabled={generating}
                            className="min-h-[48px] max-h-[200px] resize-none shadow-sm border-gray-200 focus:border-primary"
                            rows={1}
                            style={{
                              height: 'auto',
                              overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              target.style.height = 'auto'
                              target.style.height = Math.min(target.scrollHeight, 200) + 'px'
                            }}
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={generating || !message.trim()}
                          size="lg"
                          className="h-12 px-6 shadow-sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Press Enter to send, Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-16 text-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 mx-auto">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">No analysis selected</h3>
                <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                  Create a new analysis or select an existing one to continue
                </p>
              </div>
              <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="shadow-sm mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create New Analysis
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Chat Dialog - Multi-step wizard */}
      <Dialog open={showNewChatDialog} onOpenChange={(open) => {
        setShowNewChatDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Analysis</DialogTitle>
            <DialogDescription>
              Step {formStep} of {getTotalSteps()} — {
                formStep === 1 ? 'Provide error logs' :
                  formStep === 2 ? 'Add context' :
                    formStep === 3 ? 'Select analysis type' :
                      'Customize RCA format'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-4">
            {Array.from({ length: getTotalSteps() }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= formStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>

          <div className="space-y-4 py-4">
            {/* Step 1: Title + Error Logs */}
            {formStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Analysis Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Production Database Outage RCA"
                    value={newChatForm.title}
                    onChange={(e) => setNewChatForm({ ...newChatForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="errorLogs">
                      Error Logs <span className="text-destructive">*</span>
                    </Label>
                    <FileUpload
                      onFileProcessed={(text) => setNewChatForm({ ...newChatForm, errorLogs: text })}
                      accept=".txt,.log,.md,.docx"
                      label="Upload Log File"
                    />
                  </div>
                  <Textarea
                    id="errorLogs"
                    placeholder="Paste your error logs here, or upload a file..."
                    value={newChatForm.errorLogs}
                    onChange={(e) => setNewChatForm({ ...newChatForm, errorLogs: e.target.value })}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste error logs, stack traces, or upload a log file
                  </p>
                </div>
              </>
            )}

            {/* Step 2: Additional Context */}
            {formStep === 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
                  <FileUpload
                    onFileProcessed={(text) => setNewChatForm({ ...newChatForm, additionalContext: text })}
                    accept=".txt,.md,.docx"
                    label="Upload File"
                  />
                </div>
                <Textarea
                  id="additionalContext"
                  placeholder="Add any relevant context: system architecture, recent changes, timeline of events..."
                  value={newChatForm.additionalContext}
                  onChange={(e) => setNewChatForm({ ...newChatForm, additionalContext: e.target.value })}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Providing context helps generate more accurate analysis
                </p>
              </div>
            )}

            {/* Step 3: RCA Type Selection - Multi-select */}
            {formStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>What would you like to generate?</Label>
                  <p className="text-sm text-muted-foreground">Select one or more options</p>
                </div>
                <div className="grid gap-3">
                  {rcaTypeOptions.map((option) => {
                    const isSelected = newChatForm.rcaTypes.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleRCAType(option.value)}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 mt-0.5 ${isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-300'
                          }`}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Custom Templates (only for RCA types) */}
            {formStep === 4 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Optionally provide your own RCA format. If left empty, default templates will be used.
                </p>

                {newChatForm.rcaTypes.includes('user-facing') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="userFacingTemplate">User-Facing RCA Format (Optional)</Label>
                      <FileUpload
                        onFileProcessed={(text) => setNewChatForm({ ...newChatForm, customUserFacingTemplate: text })}
                        accept=".txt,.md,.docx"
                        label="Upload"
                      />
                    </div>
                    <Textarea
                      id="userFacingTemplate"
                      placeholder="Paste your custom user-facing RCA template..."
                      value={newChatForm.customUserFacingTemplate}
                      onChange={(e) => setNewChatForm({ ...newChatForm, customUserFacingTemplate: e.target.value })}
                      rows={5}
                    />
                  </div>
                )}

                {newChatForm.rcaTypes.includes('technical') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="technicalTemplate">Technical RCA Format (Optional)</Label>
                      <FileUpload
                        onFileProcessed={(text) => setNewChatForm({ ...newChatForm, customTechnicalTemplate: text })}
                        accept=".txt,.md,.docx"
                        label="Upload"
                      />
                    </div>
                    <Textarea
                      id="technicalTemplate"
                      placeholder="Paste your custom technical RCA template..."
                      value={newChatForm.customTechnicalTemplate}
                      onChange={(e) => setNewChatForm({ ...newChatForm, customTechnicalTemplate: e.target.value })}
                      rows={5}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (formStep === 1) {
                    setShowNewChatDialog(false)
                    resetForm()
                  } else {
                    setFormStep(formStep - 1)
                  }
                }}
                disabled={loading}
              >
                {formStep === 1 ? 'Cancel' : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </>
                )}
              </Button>

              {formStep < getTotalSteps() ? (
                <Button
                  type="button"
                  onClick={() => setFormStep(formStep + 1)}
                  disabled={!canProceedToNextStep()}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={createNewChat}
                  disabled={loading || !newChatForm.errorLogs.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              )}
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
              This will permanently delete this analysis and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

