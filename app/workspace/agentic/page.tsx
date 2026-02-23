'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Zap, CheckCircle2, Circle, Loader2, AlertCircle,
    ChevronDown, ChevronUp, ExternalLink, Copy, Check,
    SkipForward, FileText, Users, Link as LinkIcon, ArrowRight,
    Plus, Clock, X,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
                className={`flex items-center gap-3 px-5 py-4 ${isExpandable ? 'cursor-pointer' : ''}`}
                onClick={isExpandable ? onToggle : undefined}
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
                    {/* Jira view button on step 3 done */}
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
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(step.content!); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
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
                    {/* Parent Story */}
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

                    {/* Child Tasks */}
                    {jiraResult.tasks?.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                                Sub-tasks ({jiraResult.tasks.length})
                            </p>
                            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
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

// ── History Sidebar Item ────────────────────────────────────────────

function HistoryItem({ chat, active, onClick }: { chat: AgenticChat; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
        >
            <p className="text-sm font-medium truncate">{chat.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(chat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
        </button>
    )
}

// ── Main Page ───────────────────────────────────────────────────────

export default function AgenticPage() {
    const router = useRouter()
    const { toast } = useToast()

    // Chat history
    const [history, setHistory] = useState<AgenticChat[]>([])
    const [selectedHistoryChat, setSelectedHistoryChat] = useState<AgenticChat | null>(null)

    // New session state
    const [feature, setFeature] = useState('')
    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [selectedProject, setSelectedProject] = useState('')
    const [jiraConnected, setJiraConnected] = useState(false)
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [currentTitle, setCurrentTitle] = useState('')
    const [completedChatId, setCompletedChatId] = useState<string | null>(null)
    const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
    const [jiraModalOpen, setJiraModalOpen] = useState(false)
    const [jiraModalResult, setJiraModalResult] = useState<any>(null)
    const abortRef = useRef<AbortController | null>(null)

    // Load Jira + chat history
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
                            if (pd.projects?.[0]?.key) setSelectedProject(pd.projects[0].key)
                        }
                    }
                }

                if (chatsRes.ok) {
                    const { chats } = await chatsRes.json()
                    // Only show agentic sessions (marked with rcaType 'agentic')
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

    const handleRun = async () => {
        if (!feature.trim()) {
            toast({ title: 'Feature required', description: 'Describe the feature you want to build.', variant: 'destructive' })
            return
        }

        // Clear history selection, reset
        setSelectedHistoryChat(null)
        setSteps(INITIAL_STEPS)
        setExpandedSteps(new Set())
        setDone(false)
        setCompletedChatId(null)
        setCurrentTitle(feature.slice(0, 50))
        setRunning(true)

        abortRef.current = new AbortController()

        try {
            const res = await fetch('/api/ai/agentic/full-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, jiraProjectKey: jiraConnected ? selectedProject : null }),
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
                            updateStep(event.step, {
                                status: event.status,
                                label: event.label,
                                content: event.content,
                                jiraResult: event.jiraResult,
                                error: event.error,
                            })
                            if (event.status === 'done' && event.content && event.step !== 3) {
                                setExpandedSteps(prev => new Set(prev).add(event.step))
                            }
                            // Auto-open Jira modal when tickets are created
                            if (event.step === 3 && event.status === 'done' && event.jiraResult) {
                                setJiraModalResult(event.jiraResult)
                                setJiraModalOpen(true)
                            }
                        }

                        if (event.type === 'complete') {
                            setDone(true)
                            setCompletedChatId(event.chatId)
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

    const startNew = () => {
        abortRef.current?.abort()
        setSteps(INITIAL_STEPS)
        setExpandedSteps(new Set())
        setDone(false)
        setCompletedChatId(null)
        setRunning(false)
        setFeature('')
        setCurrentTitle('')
        setSelectedHistoryChat(null)
    }

    const completedCount = steps.filter(s => s.status === 'done').length
    const showInput = !running && !done && !selectedHistoryChat
    const showRunner = running || done

    return (
        <div className="flex gap-6 h-[calc(100vh-10rem)]">

            {/* ── Left sidebar: History ──────────────────── */}
            <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 space-y-2">
                <button
                    onClick={startNew}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    New Feature
                </button>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-2">
                    History
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                    {history.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-2">No previous runs yet.</p>
                    ) : (
                        history.map(chat => (
                            <HistoryItem
                                key={chat.id}
                                chat={chat}
                                active={selectedHistoryChat?.id === chat.id}
                                onClick={() => { setSelectedHistoryChat(chat); startNew(); setSelectedHistoryChat(chat) }}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* ── Right main content ─────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pb-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary flex-shrink-0">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Agentic Feature Builder</h1>
                        <p className="text-sm text-muted-foreground">
                            Describe a feature → PRD + user stories + Jira tickets, all automated.
                        </p>
                    </div>
                </div>

                {/* Jira banner */}
                {!jiraConnected && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        Jira not connected — agent will still generate PRD and stories.{' '}
                        <button onClick={() => router.push('/workspace/api-keys')} className="underline font-medium hover:no-underline">Connect Jira</button>
                    </div>
                )}

                {/* ── History view ── */}
                {selectedHistoryChat && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold">{selectedHistoryChat.title}</h2>
                            <button onClick={startNew} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Close
                            </button>
                        </div>
                        {selectedHistoryChat.prdDocument && (
                            <div className="rounded-xl border border-border bg-card p-5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">PRD</p>
                                <div className="max-h-[60vh] overflow-y-auto">
                                    <MarkdownRenderer content={selectedHistoryChat.prdDocument} />
                                </div>
                            </div>
                        )}
                        {selectedHistoryChat.messages?.[1]?.content && (
                            <div className="rounded-xl border border-border bg-card p-5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">User Stories</p>
                                <div className="max-h-[60vh] overflow-y-auto">
                                    <MarkdownRenderer content={selectedHistoryChat.messages[1].content.replace(/^## PRD[\s\S]*?---\n\n## User Stories\n\n/, '')} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Input form ── */}
                {showInput && (
                    <div className="space-y-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="feature-input">Describe the feature</label>
                            <textarea
                                id="feature-input"
                                value={feature}
                                onChange={e => setFeature(e.target.value)}
                                placeholder="e.g. Smart Notification Center — users should be able to see all in-app notifications in a centralized panel with filtering, mark-as-read, and email preferences..."
                                className="w-full min-h-[120px] resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                                rows={5}
                            />
                        </div>

                        {jiraConnected && jiraProjects.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="project-select">Jira Project</label>
                                <select
                                    id="project-select"
                                    value={selectedProject}
                                    onChange={e => setSelectedProject(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    {jiraProjects.map(p => (
                                        <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleRun}
                            disabled={!feature.trim()}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                        >
                            <Zap className="h-4 w-4" />
                            Run Agent
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* ── Running / Done view ── */}
                {showRunner && (
                    <>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold">
                                    {done ? '✅ Agent completed' : '⚡ Agent running...'}
                                </h2>
                                <p className="text-xs text-muted-foreground truncate max-w-sm">{currentTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {done && (
                                    <span className="text-xs text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                        {completedCount}/{steps.filter(s => s.status !== 'skipped').length} steps done
                                    </span>
                                )}
                                <button
                                    onClick={startNew}
                                    className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    {running ? 'Cancel' : 'New feature'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {steps.map(step => (
                                <StepCard
                                    key={step.id}
                                    step={step}
                                    expanded={expandedSteps.has(step.id)}
                                    onToggle={() => setExpandedSteps(prev => {
                                        const n = new Set(prev)
                                        n.has(step.id) ? n.delete(step.id) : n.add(step.id)
                                        return n
                                    })}
                                    onViewJira={step.id === 3 && step.jiraResult ? () => {
                                        setJiraModalResult(step.jiraResult)
                                        setJiraModalOpen(true)
                                    } : undefined}
                                />
                            ))}
                        </div>

                        {done && (
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <p className="flex-1 text-sm text-emerald-700 dark:text-emerald-400">
                                    All done! Your PRD, user stories{jiraConnected ? ', and Jira tickets' : ''} have been created.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Jira Tickets Modal */}
            <JiraTicketsModal
                open={jiraModalOpen}
                onClose={() => setJiraModalOpen(false)}
                jiraResult={jiraModalResult}
            />
        </div>
    )
}
