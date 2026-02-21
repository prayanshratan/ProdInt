'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Key, Save, Loader2, Link, LinkIcon, CheckCircle, XCircle, Trash2, ExternalLink } from 'lucide-react'

export default function ApiKeysPage() {
    const { toast } = useToast()

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [apiKey, setApiKey] = useState('')

    // Jira state
    const [jiraConnection, setJiraConnection] = useState<{ connected: boolean; domain?: string; email?: string } | null>(null)
    const [jiraForm, setJiraForm] = useState({ domain: '', email: '', apiToken: '' })
    const [savingJira, setSavingJira] = useState(false)
    const [disconnectingJira, setDisconnectingJira] = useState(false)
    const [showJiraForm, setShowJiraForm] = useState(false)

    useEffect(() => {
        fetchUser()
        fetchJiraStatus()
    }, [])

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/session')
            const data = await res.json()
            if (data.user) {
                setUser(data.user)
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchJiraStatus = async () => {
        try {
            const res = await fetch('/api/jira-integration/connect')
            const data = await res.json()
            setJiraConnection(data)
        } catch {
            setJiraConnection({ connected: false })
        }
    }

    const handleSaveGemini = async () => {
        if (!apiKey) return
        setSaving(true)
        try {
            const res = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            })
            if (res.ok) {
                toast({ title: 'Success', description: 'API Key updated successfully' })
                await fetchUser()
                setApiKey('')
            } else {
                toast({ title: 'Error', description: 'Failed to update API Key', variant: 'destructive' })
            }
        } catch {
            toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleConnectJira = async () => {
        if (!jiraForm.domain || !jiraForm.email || !jiraForm.apiToken) {
            toast({ title: 'Error', description: 'All Jira fields are required', variant: 'destructive' })
            return
        }
        setSavingJira(true)
        try {
            const res = await fetch('/api/jira-integration/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jiraForm),
            })
            const data = await res.json()
            if (res.ok) {
                toast({ title: 'Jira Connected!', description: data.message })
                setJiraForm({ domain: '', email: '', apiToken: '' })
                setShowJiraForm(false)
                await fetchJiraStatus()
            } else {
                toast({ title: 'Connection Failed', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
            setSavingJira(false)
        }
    }

    const handleDisconnectJira = async () => {
        setDisconnectingJira(true)
        try {
            await fetch('/api/jira-integration/connect', { method: 'DELETE' })
            toast({ title: 'Disconnected', description: 'Jira account disconnected' })
            setJiraConnection({ connected: false })
        } catch {
            toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' })
        } finally {
            setDisconnectingJira(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
                        <Key className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-muted-foreground text-lg">Loading API keys...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">API Keys</h1>
                <p className="text-muted-foreground text-xl">
                    Manage your external service connections
                </p>
            </div>

            {/* Gemini API Key */}
            <Card className="border-0 shadow-enterprise bg-card">
                <CardHeader className="border-b">
                    <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Google Gemini API</CardTitle>
                            <CardDescription>Configure your own API key for better limits</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={user?.hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                            className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                            {user?.hasApiKey
                                ? 'You have an API key configured. Leave blank to keep the current key.'
                                : 'No API key configured. Using default key.'}
                        </p>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                        >
                            Get your free API key from Google AI Studio
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl">
                        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                            <Key className="h-4 w-4 text-primary" />
                            Why provide your own API key?
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>Better rate limits and performance</span></li>
                            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>Your data stays under your Google account</span></li>
                            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>Help us keep this product free</span></li>
                            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>No credit card required for Google&apos;s free tier</span></li>
                        </ul>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSaveGemini} disabled={saving || !apiKey} size="lg" className="shadow-sm">
                            {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Save API Key</>)}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Jira Integration */}
            <Card className="border-0 shadow-enterprise bg-card">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                <LinkIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Jira Integration</CardTitle>
                                <CardDescription>Connect your Atlassian account to push tickets directly from the Jira Agent</CardDescription>
                            </div>
                        </div>
                        {jiraConnection?.connected && (
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                Connected
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {jiraConnection?.connected ? (
                        /* Connected state */
                        <div className="space-y-4">
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                                    <CheckCircle className="h-4 w-4" />
                                    Jira account connected
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p><span className="font-medium">Domain:</span> {jiraConnection.domain}</p>
                                    <p><span className="font-medium">Account:</span> {jiraConnection.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowJiraForm(!showJiraForm)}
                                >
                                    Update Credentials
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDisconnectJira}
                                    disabled={disconnectingJira}
                                >
                                    {disconnectingJira ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                                    Disconnect
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground space-y-1.5">
                                <p className="font-medium text-foreground">No Jira account connected</p>
                                <p>Connect to push user stories as Jira tickets directly from the Jira Agent chat.</p>
                            </div>
                        </div>
                    )}

                    {/* Jira credentials form (shown when not connected OR updating) */}
                    {(!jiraConnection?.connected || showJiraForm) && (
                        <div className="mt-5 space-y-4 border-t pt-5">
                            <h4 className="font-medium text-sm">
                                {jiraConnection?.connected ? 'Update Jira Credentials' : 'Connect Jira Account'}
                            </h4>

                            <div className="space-y-2">
                                <Label htmlFor="jiraDomain" className="text-sm font-medium">
                                    Jira Domain <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="jiraDomain"
                                    value={jiraForm.domain}
                                    onChange={(e) => setJiraForm({ ...jiraForm, domain: e.target.value })}
                                    placeholder="yourcompany.atlassian.net"
                                    className="h-11"
                                />
                                <p className="text-xs text-muted-foreground">Your Atlassian Cloud domain (without https://)</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jiraEmail" className="text-sm font-medium">
                                    Atlassian Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="jiraEmail"
                                    type="email"
                                    value={jiraForm.email}
                                    onChange={(e) => setJiraForm({ ...jiraForm, email: e.target.value })}
                                    placeholder="you@company.com"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jiraToken" className="text-sm font-medium">
                                    Atlassian API Token <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="jiraToken"
                                    type="password"
                                    value={jiraForm.apiToken}
                                    onChange={(e) => setJiraForm({ ...jiraForm, apiToken: e.target.value })}
                                    placeholder="••••••••••••••••"
                                    className="h-11"
                                />
                                <a
                                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                                >
                                    Generate an API token in Atlassian account settings
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    onClick={handleConnectJira}
                                    disabled={savingJira || !jiraForm.domain || !jiraForm.email || !jiraForm.apiToken}
                                    size="lg"
                                    className="shadow-sm"
                                >
                                    {savingJira ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
                                    ) : (
                                        <><Link className="h-4 w-4 mr-2" />Connect Jira</>
                                    )}
                                </Button>
                                {showJiraForm && (
                                    <Button variant="ghost" onClick={() => setShowJiraForm(false)}>Cancel</Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
