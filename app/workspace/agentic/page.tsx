'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Zap, CheckCircle2, Circle, Loader2, AlertCircle,
    ChevronDown, ChevronUp, ExternalLink, Copy, Check,
    SkipForward, FileText, Users, Link as LinkIcon, Plus,
    CheckCircle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useToast } from '@/hooks/use-toast'

// ── Types ──────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

interface AgentStep {
    id: number
    label: string
    description: string
    status: StepStatus
    content?: string
    jiraResult?: any
    error?: string
}

interface JiraProject { key: string; name: string }

interface AgenticChat {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    messages: any[]
    prdDocument?: string
}

const INITIAL_STEPS: AgentStep[] = [
    { id: 1, label: 'Generate PRD', description: 'Creating a comprehensive Product Requirements Document', status: 'pending' },
    { id: 2, label: 'Generate User Stories', description: 'Breaking the PRD into structured Jira user stories with ACs', status: 'pending' },
    { id: 3, label: 'Create Jira Tickets', description: 'Pushing all user stories directly to your Jira board', status: 'pending' },
]

// ── StepIcon ───────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
    switch (status) {
        case 'running': return <Loader2 className="h-5 w-5 text-primary animate-spin" />
        case 'done': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
        case 'skipped': return <SkipForward className="h-5 w-5 text-muted-foreground" />
        default: return <Circle className="h-5 w-5 text-muted-foreground/40" />
    }
}

// ── StepCard ───────────────────────────────────────────────────────

function StepCard({ step, expanded, onToggle, onViewJira }: {
    step: AgentStep
    expanded: boolean
    onToggle: () => void
    onViewJira?: () => void
}) {
    const isExpandable = (step.status === 'done' || step.status === 'error') && (step.content || step.error || step.jiraResult)
    const [copied, setCopied] = useState(false)

    const borderColor =
        step.status === 'running' ? 'border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]' :
            step.status === 'done' ? 'border-emerald-500/30' :
                step.status === 'error' ? 'border-red-500/30' :
                    step.status === 'skipped' ? 'border-border/30' : 'border-border/50'

    const bgColor =
        step.status === 'running' ? 'bg-primary/5' :
            step.status === 'done' ? 'bg-emerald-500/5' :
                step.status === 'error' ? 'bg-red-500/5' : 'bg-muted/20'

    return (
        <div className={`rounded-xl border transition-all duration-300 ${borderColor} ${bgColor}`}>
            <div
                className={`flex items-center gap-3 px-5 py-4 ${isExpandable && step.id !== 3 ? 'cursor-pointer' : ''}`}
                onClick={isExpandable && step.id !== 3 ? onToggle : undefined}
            >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${step.status === 'running' ? 'border-primary/40 bg-primary/10' :
                    step.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' :
                        step.status === 'error' ? 'border-red-500/30 bg-red-500/10' :
                            'border-border bg-background'}`}>
                    <StepIcon status={step.status} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{step.label}</span>
                        {step.status === 'running' && <span className="text-xs text-primary animate-pulse">Processing...</span>}
                        {step.status === 'skipped' && <span className="text-xs text-muted-foreground">Skipped</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {step.id === 3 && step.status === 'done' && step.jiraResult && onViewJira && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onViewJira() }}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Tickets
                        </button>
                    )}
                    {step.status === 'done' && step.content && step.id !== 3 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(step.content!)
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    {isExpandable && step.id !== 3 && (
                        expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </div>

            {expanded && isExpandable && step.id !== 3 && (
                <div className="px-5 pb-5 border-t border-border/50">
                    {step.error && <p className="text-sm text-red-500 mt-4">{step.error}</p>}
                    {step.content && (
                        <div className="mt-4 max-h-80 overflow-y-auto rounded-lg bg-background/50 p-4 border border-border/50">
                            <MarkdownRenderer content={step.content} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Jira Tickets Modal ─────────────────────────────────────────────

function JiraTicketsModal({ open, onClose, jiraResult }: { open: boolean; onClose: () => void; jiraResult: any }) {
    if (!jiraResult) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-blue-500" />
                        Jira Tickets Created
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {jiraResult.storyUrl && (
                        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                            <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Parent Story</p>
                            <a
                                href={jiraResult.storyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                {jiraResult.storyKey}
                            </a>
                        </div>
                    )}

                    {jiraResult.tasks?.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                                Sub-tasks ({jiraResult.tasks.length})
                            </p>
                            <div className="space-y-1.5 pl-4 border-l-2 border-primary/20">
                                {jiraResult.tasks.map((t: any) => (
                                    <a
                                        key={t.key}
                                        href={t.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 p-2 rounded-lg transition-colors group"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary group-hover:text-foreground" />
                                        <div>
                                            <span className="font-medium text-foreground">{t.key}</span>
                                            <span className="text-muted-foreground"> — {t.title}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── New Feature Dialog ─────────────────────────────────────────────

function NewFeatureDialog({ open, onClose, jiraConnected, jiraProjects, onRun }: {
    open: boolean
    onClose: () => void
    jiraConnected: boolean
    jiraProjects: JiraProject[]
    onRun: (feature: string, projectKey: string) => void
}) {
    const [feature, setFeature] = useState('')
    const [selectedProject, setSelectedProject] = useState(jiraProjects[0]?.key || '')
    const { toast } = useToast()

    useEffect(() => {
        if (jiraProjects[0]?.key) setSelectedProject(jiraProjects[0].key)
    }, [jiraProjects])

    const handleSubmit = () => {
        if (!feature.trim()) {
            toast({ title: 'Feature required', description: 'Please describe the feature.', variant: 'destructive' })
            return
        }
        onRun(feature, selectedProject)
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
                            placeholder="e.g. Smart Notification Center — users should see all in-app notifications in a centralized panel with filtering, mark-as-read, and email preferences..."
                            className="w-full min-h-[120px] resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            rows={5}
                            autoFocus
                        />
                    </div>

                    {jiraConnected && jiraProjects.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Jira Project</label>
                            <select
                                value={selectedProject}
                                onChange={e => setSelectedProject(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {jiraProjects.map(p => (
                                    <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!jiraConnected && (
                        <p className="text-sm text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                            ⚠ Jira not connected — agent will generate PRD and stories only.
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!feature.trim()} className="flex-1">
                            <Zap className="h-4 w-4 mr-2" />
                            Run Agent
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Page ───────────────────────────────────────────────────────

export default function AgenticPage() {
    const router = useRouter()
    const { toast } = useToast()

    const [history, setHistory] = useState<AgenticChat[]>([])
    const [selectedHistoryChat, setSelectedHistoryChat] = useState<AgenticChat | null>(null)
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [chatToDelete, setChatToDelete] = useState<string | null>(null)

    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [jiraConnected, setJiraConnected] = useState(false)

    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [currentTitle, setCurrentTitle] = useState('')
    const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
    const [jiraModalOpen, setJiraModalOpen] = useState(false)
    const [jiraModalResult, setJiraModalResult] = useState<any>(null)
    const abortRef = useRef<AbortController | null>(null)

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
                        if (pr.ok) {
                            const pd = await pr.json()
                            setJiraProjects(pd.projects || [])
                        }
                    }
                }

                if (chatsRes.ok) {
                    const { chats } = await chatsRes.json()
                    const agenticChats: AgenticChat[] = (chats || []).filter((c: any) => c.rcaType === 'agentic')
                    setHistory(agenticChats)
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

    const updateStep = (id: number, patch: Partial<AgentStep>) =>
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

    const handleRun = async (feature: string, jiraProjectKey: string) => {
        setSelectedHistoryChat(null)
        setSteps(INITIAL_STEPS)
        setExpandedSteps(new Set())
        setDone(false)
        setCurrentTitle(feature.slice(0, 60))
        setRunning(true)

        abortRef.current = new AbortController()

        try {
            const res = await fetch('/api/ai/agentic/full-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, jiraProjectKey: jiraConnected ? jiraProjectKey : null }),
                signal: abortRef.current.signal,
            })

            if (!res.ok || !res.body) throw new Error('Failed to start agent')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done: streamDone, value } = await reader.read()
                if (streamDone) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    try {
                        const event = JSON.parse(line.slice(6))
                        if (event.type === 'title') setCurrentTitle(event.title)
                        if (event.type === 'step') {
                            updateStep(event.step, { status: event.status, label: event.label, content: event.content, jiraResult: event.jiraResult, error: event.error })
                            if (event.status === 'done' && event.content && event.step !== 3) {
                                setExpandedSteps(prev => new Set(prev).add(event.step))
                            }
                            if (event.step === 3 && event.status === 'done' && event.jiraResult) {
                                setJiraModalResult(event.jiraResult)
                                setJiraModalOpen(true)
                            }
                        }
                        if (event.type === 'complete') {
                            setDone(true)
                            await refreshHistory()
                        }
                        if (event.type === 'error') toast({ title: 'Agent error', description: event.message, variant: 'destructive' })
                    } catch { }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') toast({ title: 'Error', description: err.message, variant: 'destructive' })
        } finally {
            setRunning(false)
        }
    }

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
            await refreshHistory()
            toast({ title: 'Session deleted' })
        } catch {
            toast({ title: 'Failed to delete', variant: 'destructive' })
        } finally {
            setChatToDelete(null)
            setShowDeleteDialog(false)
        }
    }

    const completedCount = steps.filter(s => s.status === 'done').length
    const showWelcome = !running && !done && !selectedHistoryChat

    return (
        <div className="space-y-6">

            {/* ── Page Header ───────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Agentic Builder</h1>
                    </div>
                    <p className="text-muted-foreground text-xl">
                        PRD → User Stories → Jira tickets, fully automated
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {jiraConnected ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Jira Connected
                        </div>
                    ) : (
                        <a
                            href="/workspace/api-keys"
                            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition-colors"
                        >
                            <AlertCircle className="h-3.5 w-3.5" />
                            Connect Jira
                        </a>
                    )}
                    <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm">
                        <Plus className="h-5 w-5 mr-2" />
                        New Feature
                    </Button>
                </div>
            </div>

            {/* ── Grid ──────────────────────────────────────── */}
            <div className="grid lg:grid-cols-4 gap-6">

                {/* Left: History sidebar */}
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
                                <div
                                    key={chat.id}
                                    className={`relative group rounded-xl transition-all-smooth ${selectedHistoryChat?.id === chat.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'hover:bg-muted/50 border border-border'}`}
                                >
                                    <button
                                        onClick={() => { setSelectedHistoryChat(chat); setRunning(false); setDone(false) }}
                                        className="w-full text-left p-3"
                                    >
                                        <p className="font-medium truncate text-sm pr-8">{chat.title}</p>
                                        <p className="text-xs opacity-70 mt-1">
                                            {new Date(chat.updatedAt).toLocaleDateString()}
                                        </p>
                                    </button>
                                    <button
                                        onClick={(e) => confirmDelete(chat.id, e)}
                                        className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive hover:text-white rounded-lg"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Right: Main content */}
                <Card className="lg:col-span-3 border-0 shadow-enterprise bg-card">
                    {(running || done) ? (
                        <>
                            {/* Running / Done header */}
                            <CardHeader className="border-b bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl">{currentTitle || 'Running agent...'}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {done
                                                ? `Completed · ${completedCount}/${steps.filter(s => s.status !== 'skipped').length} steps`
                                                : 'Agent is working...'}
                                        </p>
                                    </div>
                                    {done && (
                                        <Button variant="outline" size="sm" onClick={() => { setRunning(false); setDone(false); setSelectedHistoryChat(null) }}>
                                            New Feature
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3">
                                {steps.map(step => (
                                    <StepCard
                                        key={step.id}
                                        step={step}
                                        expanded={expandedSteps.has(step.id)}
                                        onToggle={() => setExpandedSteps(prev => { const n = new Set(prev); n.has(step.id) ? n.delete(step.id) : n.add(step.id); return n })}
                                        onViewJira={step.id === 3 && step.jiraResult ? () => { setJiraModalResult(step.jiraResult); setJiraModalOpen(true) } : undefined}
                                    />
                                ))}
                                {done && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mt-2">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                            All done! Your PRD, user stories{jiraConnected ? ', and Jira tickets' : ''} have been created.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </>
                    ) : selectedHistoryChat ? (
                        <>
                            <CardHeader className="border-b bg-muted/30">
                                <CardTitle className="text-xl">{selectedHistoryChat.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(selectedHistoryChat.updatedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 h-[600px] overflow-y-auto custom-scrollbar">
                                {selectedHistoryChat.prdDocument && (
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">PRD</p>
                                        <MarkdownRenderer content={selectedHistoryChat.prdDocument} />
                                    </div>
                                )}
                                {selectedHistoryChat.messages?.[1]?.content && (
                                    <div className="border-t pt-6">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">User Stories</p>
                                        <MarkdownRenderer content={
                                            selectedHistoryChat.messages[1].content
                                                .replace(/^## PRD[\s\S]*?---\n\n## User Stories\n\n/, '')
                                        } />
                                    </div>
                                )}
                            </CardContent>
                        </>
                    ) : (
                        // Welcome / empty state
                        <CardContent className="p-16 text-center space-y-6">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mx-auto">
                                <Zap className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold">Build a feature end-to-end</h3>
                                <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                                    Describe a feature and the agent writes the PRD, generates user stories, and creates Jira tickets automatically
                                </p>
                            </div>
                            <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                New Feature
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Dialogs */}
            <NewFeatureDialog
                open={showNewDialog}
                onClose={() => setShowNewDialog(false)}
                jiraConnected={jiraConnected}
                jiraProjects={jiraProjects}
                onRun={handleRun}
            />

            <JiraTicketsModal
                open={jiraModalOpen}
                onClose={() => setJiraModalOpen(false)}
                jiraResult={jiraModalResult}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the feature session and all its generated content.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
