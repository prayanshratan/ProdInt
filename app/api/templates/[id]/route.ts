import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTemplateById, updateTemplate, deleteTemplate } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const template = await getTemplateById(params.id)
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    if (template.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const updates = await request.json()
    
    // Prevent modification of system-generated default template (except for isDefault flag)
    if (template.name === 'Comprehensive PRD Template') {
      const allowedKeys = ['isDefault']
      const updateKeys = Object.keys(updates)
      const hasDisallowedUpdates = updateKeys.some(key => !allowedKeys.includes(key))
      
      if (hasDisallowedUpdates) {
        return NextResponse.json(
          { error: 'Cannot modify the system default template content or name' },
          { status: 400 }
        )
      }
    }
    
    const updatedTemplate = await updateTemplate(params.id, updates)
    
    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const template = await getTemplateById(params.id)
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    if (template.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Prevent deletion of system-generated default template
    if (template.name === 'Comprehensive PRD Template') {
      return NextResponse.json(
        { error: 'Cannot delete the system default template' },
        { status: 400 }
      )
    }
    
    await deleteTemplate(params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

