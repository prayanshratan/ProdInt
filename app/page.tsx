'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { FileText, Users, Sparkles, CheckCircle, ArrowRight, Zap, Shield, Clock, AlertCircle } from 'lucide-react'

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showPersonalEmailWarning, setShowPersonalEmailWarning] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Welcome back!', description: 'Login successful.' })
        router.push('/workspace')
      } else {
        toast({ 
          title: 'Login failed', 
          description: data.error || 'Invalid credentials',
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Something went wrong. Please try again.',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Check if personal email
      const email = signupData.email?.toLowerCase() || ''
      const isPersonal = email.includes('@gmail.') || email.includes('@yahoo.') || 
                         email.includes('@hotmail.') || email.includes('@outlook.') ||
                         email.includes('@icloud.') || email.includes('@aol.')
      
      if (isPersonal) {
        setLoading(false)
        setShowPersonalEmailWarning(true)
        return
      }

      // Create account for corporate email
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Account created!', description: 'Please complete your onboarding.' })
        router.push('/onboarding')
      } else {
        toast({ 
          title: 'Signup failed', 
          description: data.error || 'Could not create account',
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Something went wrong. Please try again.',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePersonalEmailContinue = async () => {
    setLoading(true)
    setShowPersonalEmailWarning(false)
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Account created!', description: 'Please complete your onboarding.' })
        router.push('/onboarding')
      } else {
        toast({ 
          title: 'Signup failed', 
          description: data.error || 'Could not create account',
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Something went wrong. Please try again.',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your ProdInt account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <div className="text-center text-sm">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setShowLogin(false); 
                    setShowSignup(true); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => { 
                    setShowLogin(false); 
                    setShowSignup(false); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  Back to home
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Get started with ProdInt today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setShowSignup(false); 
                    setShowLogin(true); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => { 
                    setShowLogin(false); 
                    setShowSignup(false); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  Back to home
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Personal Email Warning Dialog */}
        <Dialog open={showPersonalEmailWarning} onOpenChange={setShowPersonalEmailWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Personal Email Detected
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  We noticed you&apos;re using a personal email address ({signupData.email}). 
                </p>
                <p>
                  For the best team collaboration experience, we recommend using your work email. 
                  This helps with:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Better team discovery and collaboration</li>
                  <li>Easier integration with your company&apos;s tools</li>
                  <li>Professional account management</li>
                </ul>
                <p className="text-sm text-muted-foreground italic">
                  💚 Don&apos;t worry – we respect your inbox and never spam!
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPersonalEmailWarning(false)}
                className="w-full sm:w-auto"
              >
                Let me change it
              </Button>
              <Button
                type="button"
                onClick={handlePersonalEmailContinue}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Creating account...' : 'Continue with personal email'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ProdInt</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button type="button" variant="ghost" onClick={() => setShowLogin(true)}>
              Sign in
            </Button>
            <Button type="button" onClick={() => setShowSignup(true)}>
              Get started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            <span>Enterprise-grade Product Management AI</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Build Better Products{' '}
            <span className="text-primary">Faster</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered assistant that helps product managers create comprehensive PRDs, 
            user stories, and documentation in minutes, not hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button type="button" size="lg" onClick={() => setShowSignup(true)} className="text-lg px-8">
              Start for free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to ship faster
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed for modern product teams
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-4" />
              <CardTitle>PRD Generation</CardTitle>
              <CardDescription>
                Create comprehensive Product Requirements Documents using AI, 
                customizable templates, and best practices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-4" />
              <CardTitle>User Story Creation</CardTitle>
              <CardDescription>
                Generate Jira-ready user stories with acceptance criteria 
                in the perfect format for your team.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>
                Leverage AI for accurate, reliable documentation.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Save Hours Weekly</CardTitle>
              <CardDescription>
                Reduce documentation time by 80%. Focus on strategy 
                while AI handles the heavy lifting.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Use your own API keys. Your data stays with you. 
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Template Management</CardTitle>
              <CardDescription>
                Upload custom templates, manage multiple formats, 
                and maintain consistency across all documents.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-purple-600 text-white border-0">
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-3xl md:text-4xl">
              Ready to transform your product workflow?
            </CardTitle>
            <CardDescription className="text-lg text-white/90">
              Join product teams who are shipping faster and building better with ProdInt.
            </CardDescription>
            <div className="pt-4">
              <Button 
                type="button"
                size="lg" 
                variant="secondary"
                onClick={() => setShowSignup(true)}
                className="text-lg px-8"
              >
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">ProdInt</span>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Built by{' '}
              <a 
                href="https://www.linkedin.com/in/prayanshratan/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Prayansh
              </a>
              {' '}with ❤️ for Product Managers
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 ProdInt. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

