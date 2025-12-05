'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Sparkles } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    designation: '',
    apiKey: '',
  })

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      
      if (!data.user) {
        router.push('/')
        return
      }
      
      setUser(data.user)
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        company: data.user.company || '',
        designation: data.user.designation || '',
        apiKey: '',
      })
    }
    
    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          designation: formData.designation,
          apiKey: formData.apiKey || undefined,
        }),
      })
      
      if (res.ok) {
        toast({ 
          title: 'Welcome to ProdInt!', 
          description: 'Your profile has been set up successfully.' 
        })
        router.push('/workspace')
      } else {
        toast({ 
          title: 'Error', 
          description: 'Failed to update profile',
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Something went wrong',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Welcome to ProdInt!</CardTitle>
          <CardDescription>
            Let&apos;s set up your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Designation (Optional)</Label>
              <Input
                id="designation"
                type="text"
                placeholder="Senior Product Manager"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Google Gemini API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIza..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                We appreciate if you use your own API key. This is a free product and helps us maintain it. 
                Don&apos;t worry, if you don&apos;t have one, we&apos;ll use our default key.
              </p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-block"
              >
                Get your free API key from Google AI Studio →
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

