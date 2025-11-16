'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  Sparkles, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  FolderOpen
} from 'lucide-react'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        
        if (!data.user) {
          router.push('/')
          return
        }
        
        setUser(data.user)
      } catch (error) {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    
    checkSession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast({ title: 'Logged out', description: 'See you soon!' })
      router.push('/')
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to logout',
        variant: 'destructive' 
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/workspace', label: 'Dashboard', icon: Sparkles },
    { href: '/workspace/prd', label: 'PRD Agent', icon: FileText },
    { href: '/workspace/jira', label: 'Jira Agent', icon: Users },
    { href: '/workspace/templates', label: 'Templates', icon: FolderOpen },
    { href: '/workspace/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Top Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/workspace" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ProdInt</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-sm">
              <span className="text-muted-foreground">Welcome, </span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

