import fs from 'fs/promises'
import path from 'path'
import { hashSync, compareSync } from 'bcryptjs'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json')
const CHATS_FILE = path.join(DATA_DIR, 'chats.json')

export interface User {
  id: string
  email: string
  password: string
  name: string
  company?: string
  designation?: string
  apiKey?: string
  defaultTemplateId?: string
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
  type: 'prd' | 'jira'
  title: string
  messages: ChatMessage[]
  templateId?: string
  prdDocument?: string
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

// User operations
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
  await initDB()
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.email === email) || null
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.id === id) || null
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
  const user = await getUserByEmail(email)
  if (!user) return null
  
  const isValid = compareSync(password, user.password)
  return isValid ? user : null
}

// Template operations
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
  await initDB()
  try {
    const data = await fs.readFile(TEMPLATES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function getUserTemplates(userId: string): Promise<PRDTemplate[]> {
  const templates = await getTemplates()
  return templates.filter(t => t.userId === userId)
}

export async function getTemplateById(id: string): Promise<PRDTemplate | null> {
  const templates = await getTemplates()
  return templates.find(t => t.id === id) || null
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
    const userId = templates[index].userId
    for (const template of templates) {
      if (template.userId === userId && template.id !== id && template.isDefault) {
        template.isDefault = false
      }
    }
  }
  
  templates[index] = { ...templates[index], ...updates }
  await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2))
  
  return templates[index]
}

export async function deleteTemplate(id: string): Promise<void> {
  await initDB()
  const templates = await getTemplates()
  const filtered = templates.filter(t => t.id !== id)
  await fs.writeFile(TEMPLATES_FILE, JSON.stringify(filtered, null, 2))
}

// Chat operations
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
  await initDB()
  try {
    const data = await fs.readFile(CHATS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await getChats()
  return chats.filter(c => c.userId === userId).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function getChatById(id: string): Promise<Chat | null> {
  const chats = await getChats()
  return chats.find(c => c.id === id) || null
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
  await initDB()
  const chats = await getChats()
  const filtered = chats.filter(c => c.id !== id)
  await fs.writeFile(CHATS_FILE, JSON.stringify(filtered, null, 2))
}

