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

export interface JiraConfig {
  domain: string      // e.g. yourcompany.atlassian.net
  email: string       // Atlassian account email
  apiToken: string    // Atlassian API token
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

// Initialize data directory and files
async function initDB() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })

    try {
      await fs.access(USERS_FILE)
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([]))
    }

    try {
      await fs.access(TEMPLATES_FILE)
    } catch {
      await fs.writeFile(TEMPLATES_FILE, JSON.stringify([]))
    }

    try {
      await fs.access(CHATS_FILE)
    } catch {
      await fs.writeFile(CHATS_FILE, JSON.stringify([]))
    }
  } catch (error) {
    console.error('Error initializing database:', error)
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
  await initDB()

  const users = await getUsers()

  // Check if user already exists
  const existingUser = users.find(u => u.email === userData.email)
  if (existingUser) {
    throw new Error('User already exists')
  }

  const hashedPassword = hashSync(userData.password, 10)

  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))

  return newUser
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
  await initDB()
  const users = await getUsers()
  const index = users.findIndex(u => u.id === id)

  if (index === -1) {
    throw new Error('User not found')
  }

  users[index] = { ...users[index], ...updates }
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))

  return users[index]
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
  await initDB()

  const templates = await getTemplates()

  // If this is set as default, unset other defaults for this user
  if (templateData.isDefault) {
    for (const template of templates) {
      if (template.userId === templateData.userId && template.isDefault) {
        template.isDefault = false
      }
    }
  }

  const newTemplate: PRDTemplate = {
    ...templateData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  }

  templates.push(newTemplate)
  await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2))

  return newTemplate
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
  await initDB()
  const templates = await getTemplates()
  const index = templates.findIndex(t => t.id === id)

  if (index === -1) {
    throw new Error('Template not found')
  }

  // If setting as default, unset other defaults for this user
  if (updates.isDefault) {
    const existing = await prisma.pRDTemplate.findUnique({ where: { id } })
    if (existing) {
      await prisma.pRDTemplate.updateMany({
        where: { userId: existing.userId, id: { not: id }, isDefault: true },
        data: { isDefault: false },
      })
    }
  }

  templates[index] = { ...templates[index], ...updates }
  await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2))

  return templates[index]
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.pRDTemplate.delete({ where: { id } })
}

// ─────────────────────────────────────────────
// Chat operations
// ─────────────────────────────────────────────

export async function createChat(chatData: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
  await initDB()

  const chats = await getChats()

  const newChat: Chat = {
    ...chatData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  chats.push(newChat)
  await fs.writeFile(CHATS_FILE, JSON.stringify(chats, null, 2))

  return newChat
}

export async function getChats(): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({ orderBy: { updatedAt: 'desc' } })
  return chats.map(mapChat)
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await getChats()
  return chats.filter(c => c.userId === userId).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function getChatById(id: string): Promise<Chat | null> {
  const chat = await prisma.chat.findUnique({ where: { id } })
  return chat ? mapChat(chat) : null
}

export async function updateChat(id: string, updates: Partial<Chat>): Promise<Chat> {
  await initDB()
  const chats = await getChats()
  const index = chats.findIndex(c => c.id === id)

  if (index === -1) {
    throw new Error('Chat not found')
  }

  chats[index] = {
    ...chats[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  await fs.writeFile(CHATS_FILE, JSON.stringify(chats, null, 2))

  return chats[index]
}

export async function deleteChat(id: string): Promise<void> {
  await prisma.chat.delete({ where: { id } })
}
