'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Zap, CheckCircle2, Loader2, AlertCircle, Plus, Trash2,
    CheckCircle, ExternalLink, Link as LinkIcon, Send,
    Pencil, Eye, ArrowRight, RotateCcw, ChevronRight,
    Copy, Check, Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useToast } from '@/hooks/use-toast'

// ── Types ──────────────────────────────────────────────────────────

type Stage = 'idle' | 'loading' | 'review_prd' | 'review_stories' | 'pushing_jira' | 'complete'

interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface JiraProject { key: string; name: string }
interface AgenticChat {
    id: string; title: string; createdAt: string; updatedAt: string
    messages: any[]; prdDocument?: string
}

// ── Stage Progress Bar ─────────────────────────────────────────────

function StageBar({ stage }: { stage: Stage }) {
    const steps = [
        { key: 'review_prd', label: 'PRD' },
        { key: 'review_stories', label: 'User Stories' },
        { key: 'complete', label: 'Jira Tickets' },
    ]
    const activeIdx =
        stage === 'review_prd' || stage === 'loading' ? 0 :
            stage === 'review_stories' ? 1 :
                stage === 'pushing_jira' || stage === 'complete' ? 2 : -1

    return (
        <div className="flex items-center gap-2 px-1">
            {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${i < activeIdx ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' :
                        i === activeIdx ? 'bg-primary/10 text-primary border border-primary/30' :
                            'bg-muted/50 text-muted-foreground border border-border/50'}`}>
                        {i < activeIdx && <CheckCircle2 className="h-3 w-3" />}
                        {s.label}
                    </div>
                    {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                </div>
            ))}
        </div>
    )
}

// ── Content Panel (view / edit toggle + chat) ──────────────────────

function ContentPanel({
    content,
    onContentChange,
    chatMessages,
    onSendChat,
    chatLoading,
    stageLabel,
    editPlaceholder,
    filename,
}: {
    content: string
    onContentChange: (v: string) => void
    chatMessages: ChatMessage[]
    onSendChat: (msg: string) => void
    chatLoading: boolean
    stageLabel: string
    editPlaceholder?: string
    filename: string
}) {
    const [editMode, setEditMode] = useState(false)
    const [chatInput, setChatInput] = useState('')
    const [copied, setCopied] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({ title: 'Copied to clipboard' })
    }

    const handleDownload = async (format: 'md' | 'docx') => {
        const safe = filename.replace(/[^a-z0-9\-_]/gi, '-').toLowerCase()
        if (format === 'md') {
            const blob = new Blob([content], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `${safe}.md`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast({ title: 'Downloaded', description: `${safe}.md` })
        } else {
            setDownloading(true)
            try {
                const res = await fetch('/api/convert/markdown-to-docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markdown: content, title: filename }),
                })
                if (res.ok) {
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `${safe}.docx`
                    document.body.appendChild(a); a.click(); document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast({ title: 'Downloaded', description: `${safe}.docx` })
                } else {
                    toast({ title: 'DOCX conversion failed', variant: 'destructive' })
                }
            } catch { toast({ title: 'Download failed', variant: 'destructive' }) }
            finally { setDownloading(false) }
        }
    }

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

    const handleSend = () => {
        if (!chatInput.trim() || chatLoading) return
        const msg = chatInput.trim()
        setChatInput('')
        onSendChat(msg)
    }

    return (
        <div className="flex flex-col gap-0 h-[600px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stageLabel}</span>
                <div className="flex items-center gap-1">
                    {/* Copy */}
                    <button onClick={handleCopy} title="Copy to clipboard"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-colors">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    {/* Download MD */}
                    <button onClick={() => handleDownload('md')} title="Download Markdown"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-colors">
                        <Download className="h-3.5 w-3.5" />.md
                    </button>
                    {/* Download DOCX */}
                    <button onClick={() => handleDownload('docx')} disabled={downloading} title="Download DOCX"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-colors disabled:opacity-50">
                        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}DOCX
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                    {/* Edit toggle */}
                    <button onClick={() => setEditMode(e => !e)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-colors">
                        {editMode ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {editMode ? (
                        <textarea
                            value={content}
                            onChange={e => onContentChange(e.target.value)}
                            placeholder={editPlaceholder}
                            className="w-full h-full min-h-[200px] resize-none bg-transparent text-sm font-mono leading-relaxed focus:outline-none"
                        />
                    ) : (
                        <MarkdownRenderer content={content} />
                    )}
                </div>

                {/* Chat refinement section */}
                <div className="border-t">
                    {/* Past chat messages (if any refinements done) */}
                    {chatMessages.length > 0 && (
                        <div className="max-h-40 overflow-y-auto px-4 py-3 space-y-2 bg-muted/10 custom-scrollbar">
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === 'user'
                                        ? 'bg-primary text-white'
                                        : 'bg-muted text-foreground border border-border'}`}>
                                        {m.role === 'user' ? m.content : '✅ Content updated'}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                    )}

                    {/* Chat input */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-t">
                        <div className="flex-1 relative">
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                placeholder="Ask for changes... e.g. 'Add a section on error handling'"
                                disabled={chatLoading}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSend}
                            disabled={!chatInput.trim() || chatLoading}
                            className="h-9 w-9 p-0 flex-shrink-0"
                        >
                            {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── New Feature Dialog ─────────────────────────────────────────────

function NewFeatureDialog({ open, onClose, onStart }: {
    open: boolean
    onClose: () => void
    onStart: (feature: string) => void
}) {
    const [feature, setFeature] = useState('')
    const { toast } = useToast()

    const handleSubmit = () => {
        if (!feature.trim()) {
            toast({ title: 'Feature required', variant: 'destructive' })
            return
        }
        onStart(feature.trim())
        setFeature('')
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>New Agentic Feature</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Describe the feature <span className="text-destructive">*</span></label>
                        <textarea
                            value={feature}
                            onChange={e => setFeature(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
                            placeholder="e.g. Smart Notification Center — users should see all in-app notifications in a centralized panel with filtering, mark-as-read, and email preferences..."
                            className="w-full min-h-[120px] resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            rows={6}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">The agent will generate the PRD first — you can review and edit before stories are generated.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!feature.trim()} className="flex-1">
                            <Zap className="h-4 w-4 mr-2" />
                            Generate PRD
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Jira Project Dialog ─────────────────────────────────────────────

function JiraProjectDialog({ open, onClose, projects, onPush }: {
    open: boolean
    onClose: () => void
    projects: JiraProject[]
    onPush: (projectKey: string) => void
}) {
    const [selected, setSelected] = useState(projects[0]?.key || '')
    useEffect(() => { if (projects[0]?.key) setSelected(projects[0].key) }, [projects])
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Push to Jira</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Jira Project</label>
                        <select
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button onClick={() => { onPush(selected); onClose() }} disabled={!selected} className="flex-1">
                            Push to Jira
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Jira Results ───────────────────────────────────────────────────

function JiraResults({ result }: { result: any }) {
    return (
        <div className="p-6 space-y-4 h-[600px] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                Tickets created successfully
            </div>

            {result.storyUrl && (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parent Story</p>
                    <a href={result.storyUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        {result.storyKey}
                    </a>
                </div>
            )}

            {result.tasks?.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Sub-tasks ({result.tasks.length})
                    </p>
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        {result.tasks.map((t: any) => (
                            <a key={t.key} href={t.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-start gap-2 text-sm hover:bg-muted/40 p-2 rounded-lg transition-colors group">
                                <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                                <div>
                                    <span className="font-medium">{t.key}</span>
                                    <span className="text-muted-foreground"> — {t.title}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── History Section (expandable with download actions) ───────────

function HistorySection({
    title, content, filename, jiraResult, defaultExpanded = false,
}: {
    title: string
    content?: string
    filename: string
    jiraResult?: any
    defaultExpanded?: boolean
}) {
    const [expanded, setExpanded] = useState(defaultExpanded)
    const [copied, setCopied] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const { toast } = useToast()

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!content) return
        navigator.clipboard.writeText(content)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
        toast({ title: 'Copied to clipboard' })
    }

    const handleDownload = async (format: 'md' | 'docx', e: React.MouseEvent) => {
        e.stopPropagation()
        if (!content) return
        const safe = filename.replace(/[^a-z0-9\-_]/gi, '-').toLowerCase()
        if (format === 'md') {
            const blob = new Blob([content], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `${safe}.md`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast({ title: 'Downloaded', description: `${safe}.md` })
        } else {
            setDownloading(true)
            try {
                const res = await fetch('/api/convert/markdown-to-docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markdown: content, title: filename }),
                })
                if (res.ok) {
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `${safe}.docx`
                    document.body.appendChild(a); a.click(); document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast({ title: 'Downloaded', description: `${safe}.docx` })
                } else { toast({ title: 'DOCX conversion failed', variant: 'destructive' }) }
            } catch { toast({ title: 'Download failed', variant: 'destructive' }) }
            finally { setDownloading(false) }
        }
    }

    const hasContent = Boolean(content || jiraResult)
    if (!hasContent) return null

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            {/* Header row */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold">{title}</span>
                </div>
                {/* Action buttons — stop propagation so they don't toggle expand */}
                {content && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={handleCopy} title="Copy"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={(e) => handleDownload('md', e)} title="Download .md"
                            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                            <Download className="h-3.5 w-3.5" />.md
                        </button>
                        <button onClick={(e) => handleDownload('docx', e)} disabled={downloading} title="Download DOCX"
                            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50">
                            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}DOCX
                        </button>
                    </div>
                )}
            </button>

            {/* Body */}
            {expanded && (
                <div className="p-5 border-t border-border/50">
                    {content && !jiraResult && <MarkdownRenderer content={content} />}
                    {jiraResult && (
                        <div className="space-y-3">
                            {jiraResult.storyUrl && (
                                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Parent Story</p>
                                    <a href={jiraResult.storyUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
                                        <ExternalLink className="h-4 w-4" />{jiraResult.storyKey}
                                    </a>
                                </div>
                            )}
                            {jiraResult.tasks?.length > 0 && (
                                <div className="space-y-1.5 pl-4 border-l-2 border-primary/20">
                                    {jiraResult.tasks.map((t: any) => (
                                        <a key={t.key} href={t.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 p-2 rounded-lg transition-colors">
                                            <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                                            <span><span className="font-medium text-foreground">{t.key}</span> — {t.title}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Main Page ───────────────────────────────────────────────────────

export default function AgenticPage() {
    const { toast } = useToast()

    const [history, setHistory] = useState<AgenticChat[]>([])
    const [selectedHistoryChat, setSelectedHistoryChat] = useState<AgenticChat | null>(null)
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [chatToDelete, setChatToDelete] = useState<string | null>(null)
    const [showJiraProjectDialog, setShowJiraProjectDialog] = useState(false)

    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [jiraConnected, setJiraConnected] = useState(false)

    // Session state
    const [stage, setStage] = useState<Stage>('idle')
    const [loadingLabel, setLoadingLabel] = useState('')
    const [chatId, setChatId] = useState<string | null>(null)
    const [featureTitle, setFeatureTitle] = useState('')

    const [prdContent, setPrdContent] = useState('')
    const [storiesContent, setStoriesContent] = useState('')
    const [jiraResult, setJiraResult] = useState<any>(null)

    const [prdChatMessages, setPrdChatMessages] = useState<ChatMessage[]>([])
    const [storiesChatMessages, setStoriesChatMessages] = useState<ChatMessage[]>([])
    const [chatLoading, setChatLoading] = useState(false)

    // Load Jira + history on mount
    useEffect(() => {
        async function load() {
            try {
                const [jiraRes, chatsRes] = await Promise.all([
                    fetch('/api/jira-integration/connect'),
                    fetch('/api/chats'),
                ])
                if (jiraRes.ok) {
                    const d = await jiraRes.json()
                    if (d.connected) {
                        setJiraConnected(true)
                        const pr = await fetch('/api/jira-integration/projects')
                        if (pr.ok) { const pd = await pr.json(); setJiraProjects(pd.projects || []) }
                    }
                }
                if (chatsRes.ok) {
                    const { chats } = await chatsRes.json()
                    setHistory((chats || []).filter((c: any) => c.rcaType === 'agentic'))
                }
            } catch { }
        }
        load()
    }, [])

    const refreshHistory = async () => {
        try {
            const res = await fetch('/api/chats')
            if (res.ok) {
                const { chats } = await res.json()
                setHistory((chats || []).filter((c: any) => c.rcaType === 'agentic'))
            }
        } catch { }
    }

    // ── Stage 1: Start — Generate PRD ──────────────────────────────
    const handleStart = async (feature: string) => {
        setSelectedHistoryChat(null)
        setPrdContent(''); setStoriesContent(''); setJiraResult(null)
        setPrdChatMessages([]); setStoriesChatMessages([])
        setChatId(null); setFeatureTitle(feature.slice(0, 60))
        setLoadingLabel('Generating PRD...')
        setStage('loading')

        try {
            const res = await fetch('/api/ai/agentic/generate-prd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setChatId(data.chatId)
            setFeatureTitle(data.featureTitle)
            setPrdContent(data.prd)
            setStage('review_prd')
            await refreshHistory()
        } catch (err: any) {
            toast({ title: 'Generation failed', description: err.message, variant: 'destructive' })
            setStage('idle')
        }
    }

    // ── Chat refinement ────────────────────────────────────────────
    const handleChat = async (message: string, currentStage: 'prd' | 'stories') => {
        if (!chatId) return
        setChatLoading(true)
        const currentContent = currentStage === 'prd' ? prdContent : storiesContent
        const addMsg = currentStage === 'prd' ? setPrdChatMessages : setStoriesChatMessages

        addMsg(prev => [...prev, { role: 'user', content: message }])

        try {
            const res = await fetch('/api/ai/agentic/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message, stage: currentStage, currentContent }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            if (currentStage === 'prd') setPrdContent(data.response)
            else setStoriesContent(data.response)

            addMsg(prev => [...prev, { role: 'assistant', content: data.response }])
        } catch (err: any) {
            toast({ title: 'Request failed', description: err.message, variant: 'destructive' })
            addMsg(prev => prev.slice(0, -1)) // Remove optimistic user message
        } finally {
            setChatLoading(false)
        }
    }

    // ── Stage 2: Approve PRD → Generate Stories ────────────────────
    const handleApprovePrd = async () => {
        if (!chatId) return
        setLoadingLabel('Generating user stories from your PRD...')
        setStage('loading')
        try {
            const res = await fetch('/api/ai/agentic/generate-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, finalPrd: prdContent }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setStoriesContent(data.stories)
            setStoriesChatMessages([])
            setStage('review_stories')
        } catch (err: any) {
            toast({ title: 'Stories generation failed', description: err.message, variant: 'destructive' })
            setStage('review_prd')
        }
    }

    // ── Stage 3: Approve Stories → Push to Jira ───────────────────
    const handleApproveStories = () => {
        if (!jiraConnected) {
            toast({ title: 'Jira not connected', description: 'Connect Jira in API Keys to push tickets.', variant: 'destructive' })
            return
        }
        setShowJiraProjectDialog(true)
    }

    const handlePushToJira = async (projectKey: string) => {
        if (!chatId) return
        setLoadingLabel('Creating Jira tickets...')
        setStage('pushing_jira')
        try {
            const res = await fetch('/api/ai/agentic/push-jira', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, finalStories: storiesContent, projectKey, featureTitle }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setJiraResult(data.jiraResult)
            setStage('complete')
        } catch (err: any) {
            toast({ title: 'Jira push failed', description: err.message, variant: 'destructive' })
            setStage('review_stories')
        }
    }

    // ── Delete ─────────────────────────────────────────────────────
    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setChatToDelete(id)
        setShowDeleteDialog(true)
    }

    const deleteChat = async () => {
        if (!chatToDelete) return
        try {
            await fetch(`/api/chats/${chatToDelete}`, { method: 'DELETE' })
            if (selectedHistoryChat?.id === chatToDelete) setSelectedHistoryChat(null)
            if (chatId === chatToDelete) setStage('idle')
            await refreshHistory()
            toast({ title: 'Session deleted' })
        } catch { toast({ title: 'Failed to delete', variant: 'destructive' }) }
        finally { setChatToDelete(null); setShowDeleteDialog(false) }
    }

    // ── Render helpers ─────────────────────────────────────────────
    const activeSession = stage !== 'idle'
    const showWelcome = !activeSession && !selectedHistoryChat

    return (
        <div className="space-y-6">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Agentic Builder</h1>
                    </div>
                    <p className="text-muted-foreground text-xl">PRD → User Stories → Jira, with you in the loop</p>
                </div>
                <div className="flex items-center gap-3">
                    {jiraConnected ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                            <CheckCircle className="h-3.5 w-3.5" /> Jira Connected
                        </div>
                    ) : (
                        <a href="/workspace/api-keys" className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition-colors">
                            <AlertCircle className="h-3.5 w-3.5" /> Connect Jira
                        </a>
                    )}
                    <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm">
                        <Plus className="h-5 w-5 mr-2" /> New Feature
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">

                {/* ── Sidebar: History ─────────────────────────── */}
                <Card className="lg:col-span-1 border-0 shadow-enterprise bg-card">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg font-semibold">Your Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4 h-[600px] overflow-y-auto custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="text-center py-8 space-y-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mx-auto">
                                    <Zap className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">No features built yet</p>
                            </div>
                        ) : (
                            history.map(chat => (
                                <div key={chat.id}
                                    className={`relative group rounded-xl transition-all-smooth ${selectedHistoryChat?.id === chat.id && !activeSession
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'hover:bg-muted/50 border border-border'}`}>
                                    <button
                                        onClick={() => { setSelectedHistoryChat(chat); setStage('idle') }}
                                        className="w-full text-left p-3"
                                    >
                                        <p className="font-medium truncate text-sm pr-8">{chat.title}</p>
                                        <p className="text-xs opacity-70 mt-1">{new Date(chat.updatedAt).toLocaleDateString()}</p>
                                    </button>
                                    <button
                                        onClick={(e) => confirmDelete(chat.id, e)}
                                        className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive hover:text-white rounded-lg"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* ── Main content: stage-driven ───────────────── */}
                <Card className="lg:col-span-3 border-0 shadow-enterprise bg-card">

                    {/* Loading */}
                    {stage === 'loading' || stage === 'pushing_jira' ? (
                        <CardContent className="p-16 text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <p className="text-lg font-medium">{loadingLabel}</p>
                            <p className="text-sm text-muted-foreground">This usually takes 10-20 seconds...</p>
                        </CardContent>
                    )

                        /* PRD Review */
                        : stage === 'review_prd' ? (
                            <>
                                <CardHeader className="border-b bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <CardTitle className="text-xl">{featureTitle}</CardTitle>
                                            <StageBar stage={stage} />
                                        </div>
                                        <button
                                            onClick={() => { setStage('idle'); setSelectedHistoryChat(null) }}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </CardHeader>
                                <ContentPanel
                                    content={prdContent}
                                    onContentChange={setPrdContent}
                                    chatMessages={prdChatMessages}
                                    onSendChat={(msg) => handleChat(msg, 'prd')}
                                    chatLoading={chatLoading}
                                    stageLabel="Step 1 of 3 — Review your PRD. Edit directly or ask for changes below."
                                    editPlaceholder="Edit your PRD directly in markdown..."
                                    filename={`${featureTitle}-PRD`}
                                />
                                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                                    <Button variant="ghost" size="sm" onClick={() => handleStart(featureTitle)} className="gap-1.5">
                                        <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                                    </Button>
                                    <Button onClick={handleApprovePrd} className="gap-2">
                                        Looks good — Generate User Stories
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )

                            /* Stories Review */
                            : stage === 'review_stories' ? (
                                <>
                                    <CardHeader className="border-b bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <CardTitle className="text-xl">{featureTitle}</CardTitle>
                                                <StageBar stage={stage} />
                                            </div>
                                            <button onClick={() => setStage('review_prd')} className="text-xs text-muted-foreground hover:text-foreground">
                                                ← Back to PRD
                                            </button>
                                        </div>
                                    </CardHeader>
                                    <ContentPanel
                                        content={storiesContent}
                                        onContentChange={setStoriesContent}
                                        chatMessages={storiesChatMessages}
                                        onSendChat={(msg) => handleChat(msg, 'stories')}
                                        chatLoading={chatLoading}
                                        stageLabel="Step 2 of 3 — Review user stories. Edit directly or ask for changes below."
                                        editPlaceholder="Edit your user stories directly in markdown..."
                                        filename={`${featureTitle}-User-Stories`}
                                    />
                                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                                        <Button variant="ghost" size="sm" onClick={handleApprovePrd} className="gap-1.5">
                                            <RotateCcw className="h-3.5 w-3.5" /> Re-generate stories
                                        </Button>
                                        <div className="flex items-center gap-3">
                                            {!jiraConnected && (
                                                <span className="text-xs text-amber-600">Connect Jira to push tickets</span>
                                            )}
                                            <Button onClick={handleApproveStories} disabled={!jiraConnected} className="gap-2">
                                                Looks good — Push to Jira
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                            {!jiraConnected && (
                                                <Button variant="outline" size="sm" onClick={() => setStage('complete')}>
                                                    Skip Jira
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )

                                /* Complete */
                                : stage === 'complete' ? (
                                    <>
                                        <CardHeader className="border-b bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-2">
                                                    <CardTitle className="text-xl">{featureTitle}</CardTitle>
                                                    <StageBar stage={stage} />
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
                                                    <Plus className="h-4 w-4 mr-1.5" /> New Feature
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        {jiraResult ? <JiraResults result={jiraResult} /> : (
                                            <CardContent className="p-8 text-center text-muted-foreground">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                                <p className="font-medium">Feature complete!</p>
                                                <p className="text-sm mt-1">PRD and user stories saved. Jira was skipped.</p>
                                            </CardContent>
                                        )}
                                    </>
                                )

                                    /* History view */
                                    : selectedHistoryChat ? (() => {
                                        const msgs = selectedHistoryChat.messages || []
                                        // jiraMsg: new sessions have .jiraResult field; old ones just have text starting with "Jira tickets created"
                                        const jiraMsg = msgs.find((m: any) => m.jiraResult || m.content?.startsWith('Jira tickets created'))
                                        const storiesMsg = msgs.filter((m: any) =>
                                            m.role === 'assistant' &&
                                            !m.jiraResult &&
                                            !m.content?.startsWith('Jira tickets created') &&
                                            !m.content?.startsWith('[Approved') &&
                                            m.content !== selectedHistoryChat.prdDocument
                                        ).pop()
                                        return (
                                            <>
                                                <CardHeader className="border-b bg-muted/30">
                                                    <CardTitle className="text-xl">{selectedHistoryChat.title}</CardTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(selectedHistoryChat.updatedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </CardHeader>
                                                <CardContent className="p-5 space-y-3 h-[600px] overflow-y-auto custom-scrollbar">
                                                    <HistorySection
                                                        title="PRD"
                                                        content={selectedHistoryChat.prdDocument}
                                                        filename={`${selectedHistoryChat.title}-PRD`}
                                                        defaultExpanded={true}
                                                    />
                                                    <HistorySection
                                                        title="User Stories"
                                                        content={storiesMsg?.content}
                                                        filename={`${selectedHistoryChat.title}-User-Stories`}
                                                        defaultExpanded={false}
                                                    />
                                                    <HistorySection
                                                        title={`Jira Tickets${jiraMsg?.jiraResult?.tasks?.length ? ` (${jiraMsg.jiraResult.tasks.length + 1} tickets)` : ''}`}
                                                        content={!jiraMsg?.jiraResult ? jiraMsg?.content : undefined}
                                                        filename={`${selectedHistoryChat.title}-Jira`}
                                                        jiraResult={jiraMsg?.jiraResult}
                                                        defaultExpanded={!!jiraMsg}
                                                    />
                                                </CardContent>
                                            </>
                                        )
                                    })()

                                        /* Welcome / idle */
                                        : (
                                            <CardContent className="p-16 text-center space-y-6">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mx-auto">
                                                    <Zap className="h-10 w-10 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-semibold">Build a feature, your way</h3>
                                                    <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                                                        The agent drafts the PRD and stories — you review, edit, and approve each step before anything hits Jira
                                                    </p>
                                                </div>
                                                <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm mt-4">
                                                    <Plus className="h-4 w-4 mr-2" /> New Feature
                                                </Button>
                                            </CardContent>
                                        )}
                </Card>
            </div>

            {/* Dialogs */}
            <NewFeatureDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onStart={handleStart} />

            <JiraProjectDialog
                open={showJiraProjectDialog}
                onClose={() => setShowJiraProjectDialog(false)}
                projects={jiraProjects}
                onPush={handlePushToJira}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the feature session and its content.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
