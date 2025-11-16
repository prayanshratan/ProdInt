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
        setTemplates([...templates, data.template])
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">PRD Templates</h1>
          <p className="text-muted-foreground text-lg">
            Manage your custom templates and set defaults
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".md,.txt,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first template to get started
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              {template.isDefault && (
                <div className="absolute top-4 right-4">
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle className="pr-20">{template.name}</CardTitle>
                <CardDescription>
                  {template.userId === 'system' ? 'System Template' : 'Custom Template'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.content.substring(0, 150)}...
                  </p>
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(template, 'md')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download MD
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(template, 'docx')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download DOCX
                    </Button>
                    <Button
                      variant={template.isDefault ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAsDefault(template.id)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {template.isDefault ? 'Current Default' : 'Set as Default'}
                    </Button>
                    {template.name !== 'Comprehensive PRD Template' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
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

