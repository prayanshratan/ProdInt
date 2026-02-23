'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Zap, CheckCircle2, Circle, Loader2, AlertCircle,
    ChevronDown, ChevronUp, ExternalLink, Copy, Check,
    SkipForward, FileText, Users, Link as LinkIcon, ArrowRight,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useToast } from '@/hooks/use-toast'

// ── Types ──────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

interface AgentStep {
    id: number
    label: string
    description: string
    icon: React.ReactNode
    status: StepStatus
    content?: string
    jiraResult?: any
    error?: string
}

interface JiraProject {
    key: string
    name: string
}

const INITIAL_STEPS: AgentStep[] = [
    {
        id: 1,
        label: 'Generate PRD',
        description: 'Creating a comprehensive Product Requirements Document',
        icon: <FileText className="h-4 w-4" />,
        status: 'pending',
    },
    {
        id: 2,
        label: 'Generate User Stories',
        description: 'Breaking the PRD into structured Jira user stories with ACs',
        icon: <Users className="h-4 w-4" />,
        status: 'pending',
    },
    {
        id: 3,
        label: 'Create Jira Tickets',
        description: 'Pushing all user stories directly to your Jira board',
        icon: <LinkIcon className="h-4 w-4" />,
        status: 'pending',
    },
]

// ── Sub-components ─────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
    switch (status) {
        case 'running':
            return <Loader2 className="h-5 w-5 text-primary animate-spin" />
        case 'done':
            return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        case 'error':
            return <AlertCircle className="h-5 w-5 text-red-500" />
        case 'skipped':
            return <SkipForward className="h-5 w-5 text-muted-foreground" />
        default:
            return <Circle className="h-5 w-5 text-muted-foreground/40" />
    }
}

function StepCard({
    step,
    expanded,
    onToggle,
}: {
    step: AgentStep
    expanded: boolean
    onToggle: () => void
}) {
    const isExpandable = (step.status === 'done' || step.status === 'error') && (step.content || step.error)
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (step.content) {
            navigator.clipboard.writeText(step.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const borderColor =
        step.status === 'running' ? 'border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]' :
            step.status === 'done' ? 'border-emerald-500/30' :
                step.status === 'error' ? 'border-red-500/30' :
                    step.status === 'skipped' ? 'border-border/30' :
                        'border-border/50'

    const bgColor =
        step.status === 'running' ? 'bg-primary/5' :
            step.status === 'done' ? 'bg-emerald-500/5' :
                step.status === 'error' ? 'bg-red-500/5' :
                    'bg-muted/20'

    return (
        <div className={`rounded-xl border transition-all duration-300 ${borderColor} ${bgColor}`}>
            <div
                className={`flex items-center gap-4 px-5 py-4 ${isExpandable ? 'cursor-pointer' : ''}`}
                onClick={isExpandable ? onToggle : undefined}
            >
                {/* Step number + icon */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${step.status === 'running' ? 'border-primary/40 bg-primary/10' :
                            step.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' :
                                step.status === 'error' ? 'border-red-500/30 bg-red-500/10' :
                                    'border-border bg-background'
                        }`}>
                        <StepIcon status={step.status} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{step.label}</span>
                            {step.status === 'running' && (
                                <span className="text-xs text-primary font-medium animate-pulse">Processing...</span>
                            )}
                            {step.status === 'skipped' && (
                                <span className="text-xs text-muted-foreground">Skipped</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {step.status === 'done' && step.content && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    )}
                    {isExpandable && (
                        expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Expanded content */}
            {expanded && isExpandable && (
                <div className="px-5 pb-5 border-t border-border/50">
                    {step.error && (
                        <p className="text-sm text-red-500 mt-4">{step.error}</p>
                    )}
                    {step.content && step.id !== 3 && (
                        <div className="mt-4 max-h-80 overflow-y-auto rounded-lg bg-background/50 p-4 border border-border/50">
                            <MarkdownRenderer content={step.content} />
                        </div>
                    )}
                    {step.id === 3 && step.jiraResult && (
                        <div className="mt-4 space-y-3">
                            {step.jiraResult.story && (
                                <a
                                    href={step.jiraResult.story.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    {step.jiraResult.story.key} — Epic/Story
                                </a>
                            )}
                            {step.jiraResult.subTasks?.length > 0 && (
                                <div className="space-y-1.5 pl-6 border-l-2 border-primary/20">
                                    {step.jiraResult.subTasks.map((t: any) => (
                                        <a
                                            key={t.key}
                                            href={t.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            {t.key} — {t.summary}
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
    const router = useRouter()
    const { toast } = useToast()

    const [feature, setFeature] = useState('')
    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [selectedProject, setSelectedProject] = useState('')
    const [jiraConnected, setJiraConnected] = useState(false)
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [completedChatId, setCompletedChatId] = useState<string | null>(null)
    const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
    const abortRef = useRef<AbortController | null>(null)

    // Check Jira connection + load projects
    useEffect(() => {
        async function loadJira() {
            try {
                const res = await fetch('/api/jira-integration/connect')
                if (res.ok) {
                    const data = await res.json()
                    if (data.connected) {
                        setJiraConnected(true)
                        const projRes = await fetch('/api/jira-integration/projects')
                        if (projRes.ok) {
                            const projData = await projRes.json()
                            setJiraProjects(projData.projects || [])
                            if (projData.projects?.[0]?.key) setSelectedProject(projData.projects[0].key)
                        }
                    }
                }
            } catch { }
        }
        loadJira()
    }, [])

    const toggleStep = (id: number) => {
        setExpandedSteps(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const updateStep = (id: number, patch: Partial<AgentStep>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    }

    const handleRun = async () => {
        if (!feature.trim()) {
            toast({ title: 'Feature required', description: 'Describe the feature you want to build.', variant: 'destructive' })
            return
        }

        // Reset
        setSteps(INITIAL_STEPS)
        setExpandedSteps(new Set())
        setDone(false)
        setCompletedChatId(null)
        setRunning(true)

        abortRef.current = new AbortController()

        try {
            const res = await fetch('/api/ai/agentic/full-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feature,
                    jiraProjectKey: jiraConnected ? selectedProject : null,
                }),
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

                        if (event.type === 'step') {
                            updateStep(event.step, {
                                status: event.status,
                                label: event.label,
                                content: event.content,
                                jiraResult: event.jiraResult,
                                error: event.error,
                            })
                            // Auto-expand completed steps with content
                            if (event.status === 'done' && event.content) {
                                setExpandedSteps(prev => new Set(prev).add(event.step))
                            }
                        }

                        if (event.type === 'complete') {
                            setDone(true)
                            setCompletedChatId(event.chatId)
                        }

                        if (event.type === 'error') {
                            toast({ title: 'Agent error', description: event.message, variant: 'destructive' })
                        }
                    } catch { }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                toast({ title: 'Error', description: err.message, variant: 'destructive' })
            }
        } finally {
            setRunning(false)
        }
    }

    const handleReset = () => {
        abortRef.current?.abort()
        setSteps(INITIAL_STEPS)
        setExpandedSteps(new Set())
        setDone(false)
        setCompletedChatId(null)
        setRunning(false)
        setFeature('')
    }

    const completedCount = steps.filter(s => s.status === 'done').length

    return (
        <div className="max-w-3xl mx-auto space-y-8">

            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Agentic Feature Builder</h1>
                        <p className="text-sm text-muted-foreground">
                            Describe a feature. The agent writes the PRD, generates user stories, and pushes tickets to Jira — all automatically.
                        </p>
                    </div>
                </div>

                {/* Jira status banner */}
                {!jiraConnected && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Jira not connected — agent will still generate PRD and stories. Connect Jira in </span>
                        <button onClick={() => router.push('/workspace/api-keys')} className="underline font-medium hover:no-underline">API Keys</button>.
                    </div>
                )}
            </div>

            {/* Input form */}
            {!running && !done && (
                <div className="space-y-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="feature-input">
                            Describe the feature
                        </label>
                        <textarea
                            id="feature-input"
                            value={feature}
                            onChange={e => setFeature(e.target.value)}
                            placeholder="e.g. Login with Google — users should be able to sign in using their Google account via OAuth 2.0. Include support for sign-up, sign-in, and account linking."
                            className="w-full min-h-[120px] resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                            rows={5}
                        />
                    </div>

                    {jiraConnected && jiraProjects.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="project-select">
                                Jira Project
                            </label>
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
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                    >
                        <Zap className="h-4 w-4" />
                        Run Agent
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Progress header when running or done */}
            {(running || done) && (
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h2 className="text-base font-semibold">
                            {done ? '✅ Agent completed' : '⚡ Agent running...'}
                        </h2>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                            {feature}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {done && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                {completedCount}/{steps.length} steps done
                            </span>
                        )}
                        <button
                            onClick={handleReset}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50"
                        >
                            {running ? 'Cancel' : 'New feature'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step tracker */}
            {(running || done) && (
                <div className="space-y-3">
                    {steps.map(step => (
                        <StepCard
                            key={step.id}
                            step={step}
                            expanded={expandedSteps.has(step.id)}
                            onToggle={() => toggleStep(step.id)}
                        />
                    ))}
                </div>
            )}

            {/* Completion actions */}
            {done && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 text-sm text-emerald-700 dark:text-emerald-400">
                        All done! Your PRD, user stories, and Jira tickets have been created.
                    </div>
                    {completedChatId && (
                        <button
                            onClick={() => router.push('/workspace/jira')}
                            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                        >
                            View in Jira Agent →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
