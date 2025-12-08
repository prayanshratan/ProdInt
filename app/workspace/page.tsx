'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Clock, ArrowRight, FolderOpen, AlertTriangle } from 'lucide-react'

export default function WorkspacePage() {
  const router = useRouter()
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch('/api/chats')
        const data = await res.json()
        if (data.chats) {
          setChats(data.chats.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
  }, [])

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-xl">
          Welcome back! Choose what you&apos;d like to work on today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className="group cursor-pointer hover-lift border-0 shadow-enterprise bg-white overflow-hidden"
          onClick={() => router.push('/workspace/prd')}
        >
          <CardHeader className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <FileText className="h-7 w-7" />
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Create PRD</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Generate comprehensive Product Requirements Documents with AI assistance
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="group cursor-pointer hover-lift border-0 shadow-enterprise bg-white overflow-hidden"
          onClick={() => router.push('/workspace/jira')}
        >
          <CardHeader className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Users className="h-7 w-7" />
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Generate User Stories</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Create Jira-ready user stories with acceptance criteria
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Templates Section */}
      <Card className="border-0 shadow-enterprise bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                PRD Templates
              </CardTitle>
              <CardDescription className="text-base">
                Manage your custom templates and set defaults
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push('/workspace/templates')}
              className="shadow-sm"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-enterprise bg-white">
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-base">
              Your recent PRDs and user stories
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto animate-pulse">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground">Loading activity...</p>
              </div>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12 space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mx-auto">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-lg">
                  No activity yet. Start by creating your first PRD or user story!
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button onClick={() => router.push('/workspace/prd')} className="shadow-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Create PRD
                </Button>
                <Button variant="outline" onClick={() => router.push('/workspace/jira')} className="shadow-sm">
                  <Users className="h-4 w-4 mr-2" />
                  Generate User Stories
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-gray-50 cursor-pointer transition-all-smooth"
                  onClick={() => router.push(`/workspace/${chat.type}?chatId=${chat.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {chat.type === 'prd' ? (
                        <FileText className="h-5 w-5" />
                      ) : chat.type === 'rca' ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{chat.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

