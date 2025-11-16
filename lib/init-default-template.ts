/**
 * Initialize the default PRD template
 * This is called automatically when fetching templates
 */

import fs from 'fs/promises'
import path from 'path'
import { createTemplate } from './db'

export async function getDefaultTemplate(): Promise<string> {
  const templatePath = path.join(process.cwd(), 'kb/Comprehensive_PRD_Template.md')
  
  try {
    const content = await fs.readFile(templatePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Failed to load default template:', error)
    
    // Return a basic fallback template
    return `# Product Requirements Document (PRD)

## Executive Summary
Brief overview of the problem, importance, and key decisions.

## Background & Context
### Problem Statement
- What problem are we solving?
- Cost of inaction

### User Pain Points
- UX issues
- Operational burden
- Performance limitations

## Objectives & Non-Objectives
### Goals
- What success looks like

### Non-Goals
- What is explicitly out of scope

## Requirements
### Functional Requirements
- Detailed requirements with priorities

### Non-Functional Requirements
- Reliability, Security, Scalability, Performance

## User Experience Design
- User flows
- Wireframes
- UI Specifications

## Technical Design
- Proposed Architecture
- API Design
- Data Models

## Rollout Plan
- Release Strategy
- Migration Strategy
- Rollback Plan

## Metrics & Success Criteria
- Success metrics
- Instrumentation required`
  }
}

/**
 * Create default template for a new user
 */
export async function createDefaultTemplateForUser(userId: string): Promise<void> {
  try {
    const content = await getDefaultTemplate()
    
    await createTemplate({
      userId,
      name: 'Comprehensive PRD Template',
      content,
      isDefault: true,
    })
    
    console.log(`Created default template for user ${userId}`)
  } catch (error) {
    console.error('Failed to create default template for user:', error)
    // Don't throw - we don't want to block user creation if template creation fails
  }
}

