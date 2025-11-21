'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { FileText, Send, Download, Loader2, Plus, Upload, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileUpload } from '@/components/FileUpload'

export default function PRDAgentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [currentChat, setCurrentChat] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [newChatForm, setNewChatForm] = useState({
    title: '',
    templateId: '',
    onePager: '',
    additionalContext: '',
  })
  
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchChats()
    fetchTemplates()
  }, [])

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
        const prdChats = data.chats.filter((c: any) => c.type === 'prd')
        setChats(prdChats)
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const createNewChat = async () => {
    if (!newChatForm.title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prd',
          title: newChatForm.title,
          templateId: newChatForm.templateId || undefined,
        }),
      })
      
      const data = await res.json()
      if (data.chat) {
        setCurrentChat(data.chat)
        setChats([data.chat, ...chats])
        setShowNewChatDialog(false)
        
        // Auto-generate initial PRD if context provided
        if (newChatForm.onePager || newChatForm.additionalContext) {
          await sendMessage(
            'Please generate a PRD based on the provided context.',
            data.chat.id,
            newChatForm.onePager,
            newChatForm.additionalContext
          )
        }
        
        setNewChatForm({ title: '', templateId: '', onePager: '', additionalContext: '' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (
    msgText?: string, 
    chatId?: string,
    onePagerOverride?: string,
    additionalContextOverride?: string
  ) => {
    const textToSend = msgText || message
    const targetChatId = chatId || currentChat?.id
    
    if (!textToSend.trim() || !targetChatId) return
    
    setGenerating(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/ai/prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          message: textToSend,
          onePager: onePagerOverride || newChatForm.onePager,
          additionalContext: additionalContextOverride || newChatForm.additionalContext,
          templateId: currentChat?.templateId,
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
        toast({ title: 'Success', description: 'PRD deleted successfully' })
      } else {
        toast({ title: 'Error', description: 'Failed to delete PRD', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete PRD', variant: 'destructive' })
    } finally {
      setShowDeleteDialog(false)
      setChatToDelete(null)
    }
  }

  const downloadPRD = async (format: 'md' | 'docx' = 'md') => {
    if (!currentChat?.prdDocument) {
      toast({ title: 'Error', description: 'No PRD to download', variant: 'destructive' })
      return
    }
    
    if (format === 'docx') {
      try {
        const res = await fetch('/api/convert/markdown-to-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: currentChat.prdDocument,
            title: currentChat.title,
          }),
        })
        
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${currentChat.title}.docx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          toast({ title: 'Success', description: 'PRD downloaded as DOCX' })
        } else {
          toast({ title: 'Error', description: 'Failed to convert to DOCX', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to download DOCX', variant: 'destructive' })
      }
    } else {
      const blob = new Blob([currentChat.prdDocument], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentChat.title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({ title: 'Success', description: 'PRD downloaded as Markdown' })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">PRD Agent</h1>
          <p className="text-muted-foreground text-xl">
            Create comprehensive Product Requirements Documents with AI
          </p>
        </div>
        <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="shadow-sm">
          <Plus className="h-5 w-5 mr-2" />
          New PRD
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1 border-0 shadow-enterprise bg-white">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold">Your PRDs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {chats.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 mx-auto">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No PRDs yet</p>
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
                    title="Delete PRD"
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
                    </CardDescription>
                  </div>
                  {currentChat.prdDocument && (
                    <div className="flex gap-2">
                      <Button onClick={() => downloadPRD('md')} variant="outline" size="sm" className="shadow-sm">
                        <Download className="h-4 w-4 mr-2" />
                        MD
                      </Button>
                      <Button onClick={() => downloadPRD('docx')} variant="outline" size="sm" className="shadow-sm">
                        <Download className="h-4 w-4 mr-2" />
                        DOCX
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                    {currentChat.messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-16 space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-lg">Start the conversation to generate your PRD</p>
                      </div>
                    ) : (
                      currentChat.messages.map((msg: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-primary text-white'
                                : 'bg-white border'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className="text-xs opacity-60 mt-2">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    {generating && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-white border rounded-2xl p-4 shadow-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t bg-white p-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        sendMessage()
                      }}
                      className="flex gap-3"
                    >
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask for changes or provide more context..."
                        disabled={generating}
                        className="h-11 shadow-sm"
                      />
                      <Button type="submit" disabled={generating || !message.trim()} className="h-11 px-6 shadow-sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-16 text-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 mx-auto">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">No PRD selected</h3>
                <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                  Create a new PRD or select an existing one to continue
                </p>
              </div>
              <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="shadow-sm mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create New PRD
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New PRD</DialogTitle>
            <DialogDescription>
              Provide details to generate a comprehensive PRD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                PRD Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., User Authentication Feature"
                value={newChatForm.title}
                onChange={(e) => setNewChatForm({ ...newChatForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">PRD Template (Optional)</Label>
              <select
                id="template"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newChatForm.templateId}
                onChange={(e) => setNewChatForm({ ...newChatForm, templateId: e.target.value })}
              >
                <option value="">Use default template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="onePager">One-Pager / Problem Statement (Optional)</Label>
                <FileUpload
                  onFileProcessed={(text) => setNewChatForm({ ...newChatForm, onePager: text })}
                  accept=".docx,.txt,.md"
                  label="Upload File"
                />
              </div>
              <Textarea
                id="onePager"
                placeholder="Paste your problem statement, one-pager, or context here..."
                value={newChatForm.onePager}
                onChange={(e) => setNewChatForm({ ...newChatForm, onePager: e.target.value })}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any additional information, requirements, or constraints..."
                value={newChatForm.additionalContext}
                onChange={(e) => setNewChatForm({ ...newChatForm, additionalContext: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowNewChatDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={createNewChat} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create PRD
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
              This will permanently delete this PRD and all its messages. This action cannot be undone.
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

