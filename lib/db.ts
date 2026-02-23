import { hashSync, compareSync } from 'bcryptjs'
import { prisma } from './prisma'

// ─────────────────────────────────────────────
// TypeScript interfaces (same as before — no app changes needed)
// ─────────────────────────────────────────────

export interface JiraConfig {
  domain: string
  email: string
  apiToken: string
}

export interface User {
  id: string
  email: string
  password: string
  name: string
  company?: string
  designation?: string
  apiKey?: string
  defaultTemplateId?: string
  jiraConfig?: JiraConfig
  createdAt: string
}

export interface PRDTemplate {
  id: string
  userId: string
  name: string
  content: string
  isDefault: boolean
  createdAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachments?: Array<{
    name: string
    type: string
    content: string
  }>
}

export interface Chat {
  id: string
  userId: string
  type: 'prd' | 'jira' | 'rca'
  title: string
  messages: ChatMessage[]
  templateId?: string
  prdDocument?: string
  rcaDocument?: string
  rcaType?: 'analysis' | 'user-facing' | 'technical' | 'both'
  createdAt: string
  updatedAt: string
}

/**
 * Lightweight metadata — only fields needed for sidebar rendering.
 * Does NOT include messages, prdDocument, or rcaDocument.
 * Use getUserChatsMetadata() for sidebar loads (fast).
 * Use getChatById() when full content is needed (on-demand).
 */
export interface ChatMeta {
  id: string
  userId: string
  type: 'prd' | 'jira' | 'rca'
  rcaType?: string
  title: string
  templateId?: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// Mappers: Prisma types → our TypeScript interfaces
// ─────────────────────────────────────────────

function mapUser(u: any): User {
  return {
    id: u.id,
    email: u.email,
    password: u.password,
    name: u.name,
    company: u.company ?? undefined,
    designation: u.designation ?? undefined,
    apiKey: u.apiKey ?? undefined,
    defaultTemplateId: u.defaultTemplateId ?? undefined,
    jiraConfig: u.jiraConfig ? (u.jiraConfig as JiraConfig) : undefined,
    createdAt: u.createdAt.toISOString(),
  }
}

function mapTemplate(t: any): PRDTemplate {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    content: t.content,
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
  }
}

function mapChat(c: any): Chat {
  return {
    id: c.id,
    userId: c.userId,
    type: c.type as Chat['type'],
    title: c.title,
    messages: (c.messages as ChatMessage[]) ?? [],
    templateId: c.templateId ?? undefined,
    prdDocument: c.prdDocument ?? undefined,
    rcaDocument: c.rcaDocument ?? undefined,
    rcaType: c.rcaType as Chat['rcaType'] ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

// ─────────────────────────────────────────────
// User operations
// ─────────────────────────────────────────────

export async function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email: userData.email } })
  if (existing) throw new Error('User already exists')

  const hashedPassword = hashSync(userData.password, 10)

  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      company: userData.company,
      designation: userData.designation,
      apiKey: userData.apiKey,
      defaultTemplateId: userData.defaultTemplateId,
      jiraConfig: userData.jiraConfig ? (userData.jiraConfig as any) : undefined,
    },
  })

  return mapUser(user)
}

export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return users.map(mapUser)
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  return user ? mapUser(user) : null
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? mapUser(user) : null
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const data: any = {}
  if (updates.name !== undefined) data.name = updates.name
  if (updates.company !== undefined) data.company = updates.company
  if (updates.designation !== undefined) data.designation = updates.designation
  if (updates.apiKey !== undefined) data.apiKey = updates.apiKey
  if (updates.defaultTemplateId !== undefined) data.defaultTemplateId = updates.defaultTemplateId
  if (updates.jiraConfig !== undefined) {
    data.jiraConfig = updates.jiraConfig as any
  }
  if (updates.password !== undefined) data.password = updates.password

  const user = await prisma.user.update({ where: { id }, data })
  return mapUser(user)
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const isValid = compareSync(password, user.password)
  return isValid ? mapUser(user) : null
}

// ─────────────────────────────────────────────
// Template operations
// ─────────────────────────────────────────────

export async function createTemplate(templateData: Omit<PRDTemplate, 'id' | 'createdAt'>): Promise<PRDTemplate> {
  // If this is set as default, unset other defaults for this user first
  if (templateData.isDefault) {
    await prisma.pRDTemplate.updateMany({
      where: { userId: templateData.userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await prisma.pRDTemplate.create({
    data: {
      userId: templateData.userId,
      name: templateData.name,
      content: templateData.content,
      isDefault: templateData.isDefault,
    },
  })

  return mapTemplate(template)
}

export async function getTemplates(): Promise<PRDTemplate[]> {
  const templates = await prisma.pRDTemplate.findMany({ orderBy: { createdAt: 'asc' } })
  return templates.map(mapTemplate)
}

export async function getUserTemplates(userId: string): Promise<PRDTemplate[]> {
  const templates = await prisma.pRDTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return templates.map(mapTemplate)
}

export async function getTemplateById(id: string): Promise<PRDTemplate | null> {
  const template = await prisma.pRDTemplate.findUnique({ where: { id } })
  return template ? mapTemplate(template) : null
}

export async function updateTemplate(id: string, updates: Partial<PRDTemplate>): Promise<PRDTemplate> {
  // If setting as default, unset other defaults for this user first
  if (updates.isDefault) {
    const existing = await prisma.pRDTemplate.findUnique({ where: { id } })
    if (existing) {
      await prisma.pRDTemplate.updateMany({
        where: { userId: existing.userId, id: { not: id }, isDefault: true },
        data: { isDefault: false },
      })
    }
  }

  const data: any = {}
  if (updates.name !== undefined) data.name = updates.name
  if (updates.content !== undefined) data.content = updates.content
  if (updates.isDefault !== undefined) data.isDefault = updates.isDefault

  const template = await prisma.pRDTemplate.update({ where: { id }, data })
  return mapTemplate(template)
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.pRDTemplate.delete({ where: { id } })
}

// ─────────────────────────────────────────────
// Chat operations
// ─────────────────────────────────────────────

export async function createChat(chatData: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
  const chat = await prisma.chat.create({
    data: {
      userId: chatData.userId,
      type: chatData.type,
      title: chatData.title,
      messages: chatData.messages as any,
      templateId: chatData.templateId,
      prdDocument: chatData.prdDocument,
      rcaDocument: chatData.rcaDocument,
      rcaType: chatData.rcaType,
    },
  })

  return mapChat(chat)
}

export async function getChats(): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({ orderBy: { updatedAt: 'desc' } })
  return chats.map(mapChat)
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
  return chats.map(mapChat)
}

/**
 * Fast metadata-only fetch for sidebar rendering.
 * Excludes messages, prdDocument, rcaDocument — payload is ~100x smaller.
 * Always use this for initial page loads; lazy-load full chat on user selection.
 */
export async function getUserChatsMetadata(userId: string): Promise<ChatMeta[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      rcaType: true,
      title: true,
      templateId: true,
      createdAt: true,
      updatedAt: true,
      // messages, prdDocument, rcaDocument intentionally excluded
    },
  })
  return chats.map((c: {
    id: string; userId: string; type: string; rcaType: string | null;
    title: string; templateId: string | null; createdAt: Date; updatedAt: Date
  }) => ({
    id: c.id,
    userId: c.userId,
    type: c.type as ChatMeta['type'],
    rcaType: c.rcaType ?? undefined,
    title: c.title,
    templateId: c.templateId ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))
}

export async function getChatById(id: string): Promise<Chat | null> {
  const chat = await prisma.chat.findUnique({ where: { id } })
  return chat ? mapChat(chat) : null
}

export async function updateChat(id: string, updates: Partial<Chat>): Promise<Chat> {
  const data: any = {}
  if (updates.title !== undefined) data.title = updates.title
  if (updates.messages !== undefined) data.messages = updates.messages as any
  if (updates.prdDocument !== undefined) data.prdDocument = updates.prdDocument
  if (updates.rcaDocument !== undefined) data.rcaDocument = updates.rcaDocument
  if (updates.rcaType !== undefined) data.rcaType = updates.rcaType
  if (updates.templateId !== undefined) data.templateId = updates.templateId

  const chat = await prisma.chat.update({ where: { id }, data })
  return mapChat(chat)
}

export async function deleteChat(id: string): Promise<void> {
  await prisma.chat.delete({ where: { id } })
}
