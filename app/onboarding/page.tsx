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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="absolute inset-0 gradient-mesh"></div>
      <Card className="relative w-full max-w-2xl border-0 shadow-enterprise-lg animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-4xl tracking-tight">Welcome to ProdInt!</CardTitle>
          <CardDescription className="text-lg">
            Let&apos;s set up your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50 h-11"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">Company (Optional)</Label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation" className="text-sm font-medium">Designation (Optional)</Label>
              <Input
                id="designation"
                type="text"
                placeholder="Senior Product Manager"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">Google Gemini API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIza..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                We appreciate if you use your own API key. This is a free product and helps us maintain it. 
                Don&apos;t worry, if you don&apos;t have one, we&apos;ll use our default key.
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

            <Button type="submit" className="w-full h-12 text-base shadow-lg" size="lg" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

