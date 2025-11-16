import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { User } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'prodint-secret-key-change-in-production'
)

export interface SessionData {
  userId: string
  email: string
  name: string
}

export async function createSession(user: User) {
  const token = await new SignJWT({ 
    userId: user.id, 
    email: user.email,
    name: user.name 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) return null
  
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as unknown as SessionData
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

