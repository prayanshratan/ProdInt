'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Key, Save, Loader2 } from 'lucide-react'

export default function ApiKeysPage() {
    const { toast } = useToast()

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [apiKey, setApiKey] = useState('')

    useEffect(() => {
        fetchUser()
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

    const handleSave = async () => {
        if (!apiKey) return

        setSaving(true)
        try {
            const updates = { apiKey }

            const res = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })

            if (res.ok) {
                toast({ title: 'Success', description: 'API Key updated successfully' })
                await fetchUser()
                setApiKey('')
            } else {
                toast({ title: 'Error', description: 'Failed to update API Key', variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
            setSaving(false)
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

            <Card className="border-0 shadow-enterprise bg-card">
                <CardHeader className="border-b">
                    <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Google Gemini API</CardTitle>
                            <CardDescription>
                                Configure your own API key for better limits
                            </CardDescription>
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
                            className="text-xs text-primary hover:underline inline-block font-medium transition-colors"
                        >
                            Get your free API key from Google AI Studio →
                        </a>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl">
                        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                            <Key className="h-4 w-4 text-primary" />
                            Why provide your own API key?
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Better rate limits and performance</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Your data stays under your Google account</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>Help us keep this product free</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>No credit card required for Google&apos;s free tier</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving || !apiKey}
                            size="lg"
                            className="shadow-sm"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save API Key
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
