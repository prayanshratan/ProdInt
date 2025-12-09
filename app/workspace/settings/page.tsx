'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Settings as SettingsIcon, Save, LogOut, Loader2, Key, User, Sun, Moon, Laptop } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    designation: '',
    apiKey: '',
  })

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setFormData({
          name: data.user.name || '',
          company: data.user.company || '',
          designation: data.user.designation || '',
          apiKey: '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: any = {
        name: formData.name,
        company: formData.company,
        designation: formData.designation,
      }

      if (formData.apiKey) {
        updates.apiKey = formData.apiKey
      }

      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Settings saved successfully' })
        await fetchUser()
        setFormData({ ...formData, apiKey: '' })
      } else {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast({ title: 'Logged out', description: 'See you soon!' })
      router.push('/')
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to logout', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
            <SettingsIcon className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground text-lg">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-xl">
          Manage your account and preferences
        </p>

      </div>

      {/* Appearance Settings */}
      <Card className="border-0 shadow-enterprise bg-card">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            <div>
              <CardTitle className="text-xl">Appearance</CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted bg-transparent'
                }`}
            >
              <div className="mb-2 rounded-full bg-white p-2 shadow-sm border">
                <Sun className="h-6 w-6 text-orange-500" />
              </div>
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted bg-transparent'
                }`}
            >
              <div className="mb-2 rounded-full bg-slate-950 p-2 shadow-sm border border-slate-800">
                <Moon className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-muted bg-transparent'
                }`}
            >
              <div className="mb-2 rounded-full bg-slate-100 dark:bg-slate-800 p-2 shadow-sm border">
                <Laptop className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card className="border-0 shadow-enterprise bg-card">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted/50 h-11"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Your company name"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation" className="text-sm font-medium">Designation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="Your role/title"
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Key Settings */}
      <Card className="border-0 shadow-enterprise bg-card">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">API Key</CardTitle>
              <CardDescription>
                Update your Google Gemini API key for AI features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium">Google Gemini API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="shadow-sm hover:bg-destructive hover:text-white hover:border-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

