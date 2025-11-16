'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, FileText } from 'lucide-react'

interface FileUploadProps {
  onFileProcessed: (text: string, filename: string) => void
  accept?: string
  label?: string
}

export function FileUpload({ onFileProcessed, accept = '.docx,.txt,.md', label = 'Upload File' }: FileUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      if (file.name.endsWith('.docx')) {
        // Convert docx to text
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/convert/docx-to-text', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (data.text) {
          onFileProcessed(data.text, file.name)
          toast({ title: 'Success', description: 'File uploaded successfully' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to process file', variant: 'destructive' })
        }
      } else {
        // Read text file directly
        const text = await file.text()
        onFileProcessed(text, file.name)
        toast({ title: 'Success', description: 'File uploaded successfully' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' })
    } finally {
      setUploading(false)
      event.target.value = '' // Reset input
    }
  }

  return (
    <div>
      <input
        type="file"
        id="file-upload-input"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => document.getElementById('file-upload-input')?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {label}
          </>
        )}
      </Button>
    </div>
  )
}

