'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { FolderOpen, Plus, Download, Trash2, Star, Loader2, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function TemplatesPage() {
  const { toast } = useToast()
  
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch templates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast({ title: 'Error', description: 'Name and content are required', variant: 'destructive' })
      return
    }
    
    setCreating(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })
      
      const data = await res.json()
      if (data.template) {
        // Refetch all templates to ensure correct default status
        await fetchTemplates()
        setShowNewDialog(false)
        setNewTemplate({ name: '', content: '' })
        toast({ title: 'Success', description: 'Template created successfully' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const setAsDefault = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      
      if (res.ok) {
        await fetchTemplates()
        toast({ title: 'Success', description: 'Default template updated' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' })
    }
  }

  const confirmDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId)
    setShowDeleteDialog(true)
  }
  
  const deleteTemplate = async () => {
    if (!templateToDelete) return
    
    try {
      const res = await fetch(`/api/templates/${templateToDelete}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== templateToDelete))
        toast({ title: 'Success', description: 'Template deleted' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' })
    } finally {
      setShowDeleteDialog(false)
      setTemplateToDelete(null)
    }
  }

  const downloadTemplate = async (template: any, format: 'md' | 'docx' = 'md') => {
    if (format === 'docx') {
      try {
        const res = await fetch('/api/convert/markdown-to-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: template.content,
            title: template.name,
          }),
        })
        
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${template.name}.docx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          toast({ title: 'Success', description: 'Template downloaded as DOCX' })
        } else {
          toast({ title: 'Error', description: 'Failed to convert template', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' })
      }
    } else {
      const blob = new Blob([template.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({ title: 'Success', description: 'Template downloaded' })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (file.name.endsWith('.docx')) {
      // Convert docx to text
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const res = await fetch('/api/convert/docx-to-text', {
          method: 'POST',
          body: formData,
        })
        
        const data = await res.json()
        if (data.text) {
          setNewTemplate({
            name: file.name.replace(/\.(md|txt|docx)$/, ''),
            content: data.text,
          })
          setShowNewDialog(true)
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to process file', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' })
      }
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setNewTemplate({
          name: file.name.replace(/\.(md|txt|docx)$/, ''),
          content,
        })
        setShowNewDialog(true)
      }
      reader.readAsText(file)
    }
    
    event.target.value = '' // Reset input
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
            <FolderOpen className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground text-lg">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">PRD Templates</h1>
          <p className="text-muted-foreground text-xl">
            Manage your custom templates and set defaults
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".md,.txt,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => setShowNewDialog(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="border-0 shadow-enterprise bg-white">
          <CardContent className="p-16 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 mx-auto">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">No templates yet</h3>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Create your first template to get started
              </p>
            </div>
            <Button onClick={() => setShowNewDialog(true)} size="lg" className="shadow-sm mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="group relative hover-lift border-0 shadow-enterprise bg-white overflow-hidden">
              {template.isDefault && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center shadow-sm">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Default
                  </div>
                </div>
              )}
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="pr-20 text-xl">{template.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm">
                  {template.userId === 'system' ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      System Template
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                      Custom Template
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {template.content.substring(0, 150)}...
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(template, 'md')}
                    className="shadow-sm"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    MD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(template, 'docx')}
                    className="shadow-sm"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    DOCX
                  </Button>
                  <Button
                    variant={template.isDefault ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAsDefault(template.id)}
                    className="shadow-sm"
                  >
                    <Star className={`h-3 w-3 mr-1.5 ${template.isDefault ? 'fill-current' : ''}`} />
                    {template.isDefault ? 'Default' : 'Set Default'}
                  </Button>
                  {template.name !== 'Comprehensive PRD Template' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmDeleteTemplate(template.id)}
                      className="shadow-sm hover:bg-destructive hover:text-white hover:border-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a custom PRD template for your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                placeholder="e.g., Enterprise PRD Template"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">
                Template Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="template-content"
                placeholder="Paste your template content here..."
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                rows={20}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewDialog(false)
                  setNewTemplate({ name: '', content: '' })
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={createTemplate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

