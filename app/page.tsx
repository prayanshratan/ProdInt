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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="absolute inset-0 gradient-mesh"></div>
        <Card className="relative w-full max-w-md mx-4 border-0 shadow-enterprise-lg animate-scale-in">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-center text-base">Sign in to your ProdInt account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-medium shadow-sm" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <div className="text-center text-sm pt-4 border-t">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setShowLogin(false); 
                    setShowSignup(true); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-primary hover:underline font-medium"
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
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to home
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="absolute inset-0 gradient-mesh"></div>
        <Card className="relative w-full max-w-md mx-4 border-0 shadow-enterprise-lg animate-scale-in">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center tracking-tight">Create your account</CardTitle>
            <CardDescription className="text-center text-base">Get started with ProdInt today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-medium shadow-sm" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <div className="text-center text-sm pt-4 border-t">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setShowSignup(false); 
                    setShowLogin(true); 
                    setShowPersonalEmailWarning(false);
                  }}
                  className="text-primary hover:underline font-medium"
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
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to home
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">ProdInt</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowLogin(true)}
                className="text-sm font-medium"
              >
                Sign in
              </Button>
              <Button 
                type="button" 
                onClick={() => setShowSignup(true)}
                className="text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
              >
                Get started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh"></div>
        <div className="container relative mx-auto px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              <span>Enterprise-grade Product Management AI</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Build Better Products{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Faster
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered assistant that helps product managers create comprehensive PRDs, 
              user stories, and documentation in minutes, not hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button 
                type="button" 
                size="lg" 
                onClick={() => setShowSignup(true)} 
                className="text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all"
              >
                Start for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required · Free forever for individuals
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Everything you need to ship faster
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for modern product teams
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">PRD Generation</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Create comprehensive Product Requirements Documents using AI, 
                customizable templates, and best practices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">User Story Creation</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Generate Jira-ready user stories with acceptance criteria 
                in the perfect format for your team.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">AI-Powered Insights</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Leverage AI for accurate, reliable documentation that follows industry best practices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Clock className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Save Hours Weekly</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Reduce documentation time by 80%. Focus on strategy 
                while AI handles the heavy lifting.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Enterprise Security</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Use your own API keys. Your data stays with you, ensuring complete privacy and control.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover-lift border-0 shadow-enterprise hover:shadow-enterprise-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <CheckCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Template Management</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Upload custom templates, manage multiple formats, 
                and maintain consistency across all documents.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 lg:px-8 py-24 md:py-32">
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-20"></div>
          <Card className="relative overflow-hidden border-0 shadow-enterprise-lg">
            <div className="absolute inset-0 gradient-primary opacity-100"></div>
            <CardHeader className="relative text-center space-y-6 py-16 px-6">
              <CardTitle className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Ready to transform your product workflow?
              </CardTitle>
              <CardDescription className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Join product teams who are shipping faster and building better with ProdInt.
              </CardDescription>
              <div className="pt-4">
                <Button 
                  type="button"
                  size="lg" 
                  variant="secondary"
                  onClick={() => setShowSignup(true)}
                  className="text-base px-8 h-12 bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all font-medium"
                >
                  Get started for free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50/50">
        <div className="container mx-auto px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold">ProdInt</span>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Built by{' '}
              <a 
                href="https://www.linkedin.com/in/prayanshratan/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium transition-colors"
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

