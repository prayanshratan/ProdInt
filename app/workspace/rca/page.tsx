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

type RCAType = 'analysis' | 'user-facing' | 'technical' | 'both' | 'all'

interface NewChatForm {
  title: string
  errorLogs: string
  additionalContext: string
  rcaType: RCAType
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
    rcaType: 'analysis',
    customUserFacingTemplate: '',
    customTechnicalTemplate: '',
  })
  
  const [message, setMessage] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      toast({ title: 'Copied to clipboard' })
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  // Strip conversational preamble from AI responses
  const stripPreamble = (content: string): string => {
    const headingMatch = content.match(/^(#{1,6}\s+.+)$/m)
    if (headingMatch && headingMatch.index !== undefined) {
      return content.substring(headingMatch.index).trim()
    }
    return content
  }

  const downloadMessage = async (content: string, format: 'md' | 'docx' = 'md', messageIndex: number) => {
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
      rcaType: 'analysis',
      customUserFacingTemplate: '',
      customTechnicalTemplate: '',
    })
    setFormStep(1)
  }

  const getTotalSteps = () => {
    // Step 1: Title + Error Logs
    // Step 2: Additional Context  
    // Step 3: RCA Type Selection
    // Step 4: Custom Template (only if RCA types selected)
    const needsTemplateStep = ['user-facing', 'technical', 'both', 'all'].includes(newChatForm.rcaType)
    return needsTemplateStep ? 4 : 3
  }

  const canProceedToNextStep = () => {
    switch (formStep) {
      case 1:
        return newChatForm.title.trim() && newChatForm.errorLogs.trim()
      case 2:
        return true // Additional context is optional
      case 3:
        return newChatForm.rcaType
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
        
        // Auto-generate RCA based on type
        await sendMessage(
          `Analyze the following error logs and generate ${getRCATypeLabel(newChatForm.rcaType)}`,
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

  const getRCATypeLabel = (type: RCAType): string => {
    switch (type) {
      case 'analysis': return 'an error analysis'
      case 'user-facing': return 'a user-facing RCA'
      case 'technical': return 'a technical engineering RCA'
      case 'both': return 'both user-facing and technical RCAs'
      case 'all': return 'error analysis with both RCAs'
      default: return 'an analysis'
    }
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
            rcaType: newChatForm.rcaType,
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

  const rcaTypeOptions = [
    { value: 'analysis', label: 'Error Analysis', description: 'Understand what went wrong and how to fix it' },
    { value: 'user-facing', label: 'User-Facing RCA', description: 'Customer-friendly incident report' },
    { value: 'technical', label: 'Technical RCA', description: 'Detailed engineering analysis' },
    { value: 'both', label: 'Both RCAs', description: 'User-facing and technical RCAs' },
    { value: 'all', label: 'Complete Analysis', description: 'Error analysis + both RCA documents' },
  ]

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
        <Card className="lg:col-span-1 border-0 shadow-enterprise bg-white">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold">Your Analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {chats.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 mx-auto">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No analyses yet</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group rounded-xl transition-all-smooth ${
                    currentChat?.id === chat.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'hover:bg-gray-50 border border-gray-100'
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
        <Card className="lg:col-span-3 border-0 shadow-enterprise bg-white">
          {currentChat ? (
            <>
              <CardHeader className="border-b bg-gray-50/50">
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
                  <div className="flex-1 overflow-y-auto bg-white">
                    {currentChat.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground space-y-4 max-w-md px-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 mx-auto">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
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
                          
                          return (
                            <div
                              key={idx}
                              className={`group flex gap-4 mb-8 animate-fade-in ${
                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              {/* Avatar */}
                              <div className="flex-shrink-0">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    msg.role === 'user'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
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
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                      v{aiMessageIndex}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                
                                {/* Message Text */}
                                <div className={`max-w-none ${msg.role === 'user' ? 'text-right' : ''}`}>
                                  {msg.role === 'assistant' ? (
                                    <MarkdownRenderer content={msg.content} />
                                  ) : (
                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed m-0">
                                      {msg.content}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Action Bar */}
                                {msg.role === 'assistant' && (
                                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                    <button
                                      onClick={() => copyToClipboard(msg.content, idx)}
                                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
                                      title="Copy message"
                                    >
                                      {copiedIndex === idx ? (
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
                                          onClick={() => downloadMessage(msg.content, 'md', aiMessageIndex)}
                                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
                                          title="Download as Markdown"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          <span>MD</span>
                                        </button>
                                        <button
                                          onClick={() => downloadMessage(msg.content, 'docx', aiMessageIndex)}
                                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
                                          title="Download as DOCX"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                          <span>DOCX</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Loading State */}
                        {generating && (
                          <div className="flex gap-4 mb-8 animate-fade-in">
                            <div className="flex-shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <span className="text-sm font-semibold">ProdInt AI</span>
                              <div className="flex items-center gap-1 h-6">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                  <div className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                  <div className="border-t bg-gray-50/50 p-4">
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
                            className="min-h-[48px] max-h-[200px] resize-none shadow-sm border-gray-200 focus:border-orange-500"
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
                          className="h-12 px-6 shadow-sm bg-orange-600 hover:bg-orange-700"
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
              <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="shadow-sm mt-4 bg-orange-600 hover:bg-orange-700">
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
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i + 1 <= formStep ? 'bg-orange-500' : 'bg-gray-200'
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

            {/* Step 3: RCA Type Selection */}
            {formStep === 3 && (
              <div className="space-y-4">
                <Label>What would you like to generate?</Label>
                <div className="grid gap-3">
                  {rcaTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewChatForm({ ...newChatForm, rcaType: option.value as RCAType })}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        newChatForm.rcaType === option.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 mt-0.5 ${
                        newChatForm.rcaType === option.value
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {newChatForm.rcaType === option.value && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Custom Templates (only for RCA types) */}
            {formStep === 4 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Optionally provide your own RCA format. If left empty, default templates will be used.
                </p>

                {(newChatForm.rcaType === 'user-facing' || newChatForm.rcaType === 'both' || newChatForm.rcaType === 'all') && (
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

                {(newChatForm.rcaType === 'technical' || newChatForm.rcaType === 'both' || newChatForm.rcaType === 'all') && (
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
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  onClick={createNewChat} 
                  disabled={loading || !newChatForm.errorLogs.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
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

