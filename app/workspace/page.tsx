'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Clock, ArrowRight, FolderOpen } from 'lucide-react'

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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Choose what you&apos;d like to work on today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
          onClick={() => router.push('/workspace/prd')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-12 w-12 text-primary" />
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl mt-4">Create PRD</CardTitle>
            <CardDescription className="text-base">
              Generate comprehensive Product Requirements Documents with AI assistance
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
          onClick={() => router.push('/workspace/jira')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Users className="h-12 w-12 text-primary" />
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl mt-4">Generate User Stories</CardTitle>
            <CardDescription className="text-base">
              Create Jira-ready user stories with acceptance criteria
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">PRD Templates</CardTitle>
              <CardDescription>
                Manage your custom templates and set defaults
              </CardDescription>
            </div>
            <Button onClick={() => router.push('/workspace/templates')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your recent PRDs and user stories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : chats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No activity yet. Start by creating your first PRD or user story!
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button onClick={() => router.push('/workspace/prd')}>
                  Create PRD
                </Button>
                <Button variant="outline" onClick={() => router.push('/workspace/jira')}>
                  Generate User Stories
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/workspace/${chat.type}/${chat.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    {chat.type === 'prd' ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">{chat.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

