/**
 * One-time data migration script: JSON files → PostgreSQL (Neon via Prisma)
 *
 * Preserves all original IDs — safe to run multiple times (upsert).
 *
 * Run with:
 *   npm run db:migrate-data
 */

import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DATA_DIR = path.join(process.cwd(), 'data')

// ─── Helpers ──────────────────────────────────────────────────────

function toDate(value: string | undefined | null): Date {
    if (!value) return new Date()
    const d = new Date(value)
    return isNaN(d.getTime()) ? new Date() : d
}

async function readJson<T>(file: string): Promise<T[]> {
    try {
        const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
        return JSON.parse(raw) as T[]
    } catch {
        console.warn(`  ⚠️  ${file} not found or empty — skipping.`)
        return []
    }
}

// ─── Migrate Users ─────────────────────────────────────────────────

async function migrateUsers() {
    const users = await readJson<any>('users.json')
    console.log(`\n👤 Migrating ${users.length} users...`)

    let created = 0
    let skipped = 0

    for (const u of users) {
        try {
            await prisma.user.upsert({
                where: { id: u.id },
                update: {}, // don't overwrite existing DB records
                create: {
                    id: u.id,
                    email: u.email,
                    password: u.password,       // already bcrypt-hashed in JSON
                    name: u.name || 'Unknown',
                    company: u.company || null,
                    designation: u.designation || null,
                    apiKey: u.apiKey || null,
                    defaultTemplateId: u.defaultTemplateId || null,
                    jiraConfig: u.jiraConfig ?? undefined,
                    createdAt: toDate(u.createdAt),
                },
            })
            console.log(`  ✅  ${u.email}`)
            created++
        } catch (err: any) {
            console.error(`  ❌  ${u.email}: ${err.message}`)
            skipped++
        }
    }

    console.log(`  → ${created} users imported, ${skipped} skipped`)
    return created
}

// ─── Migrate Templates ─────────────────────────────────────────────

async function migrateTemplates() {
    const templates = await readJson<any>('templates.json')
    console.log(`\n📄 Migrating ${templates.length} templates...`)

    let created = 0
    let skipped = 0

    for (const t of templates) {
        // Skip if referenced user doesn't exist in DB
        const userExists = await prisma.user.findUnique({ where: { id: t.userId }, select: { id: true } })
        if (!userExists) {
            console.warn(`  ⚠️  Template "${t.name}" skipped — user ${t.userId} not found`)
            skipped++
            continue
        }

        try {
            await prisma.pRDTemplate.upsert({
                where: { id: t.id },
                update: {},
                create: {
                    id: t.id,
                    userId: t.userId,
                    name: t.name,
                    content: t.content,
                    isDefault: t.isDefault ?? false,
                    createdAt: toDate(t.createdAt),
                },
            })
            console.log(`  ✅  [${t.userId}] "${t.name}"`)
            created++
        } catch (err: any) {
            console.error(`  ❌  "${t.name}": ${err.message}`)
            skipped++
        }
    }

    console.log(`  → ${created} templates imported, ${skipped} skipped`)
    return created
}

// ─── Migrate Chats ─────────────────────────────────────────────────

async function migrateChats() {
    const chats = await readJson<any>('chats.json')
    console.log(`\n💬 Migrating ${chats.length} chats...`)

    let created = 0
    let skipped = 0

    const validTypes = ['prd', 'jira', 'rca']

    for (const c of chats) {
        // Skip if referenced user doesn't exist in DB
        const userExists = await prisma.user.findUnique({ where: { id: c.userId }, select: { id: true } })
        if (!userExists) {
            console.warn(`  ⚠️  Chat "${c.title}" skipped — user ${c.userId} not found`)
            skipped++
            continue
        }

        // Normalise type
        const type = validTypes.includes(c.type) ? c.type : 'prd'

        // updatedAt may be missing in old JSON — fall back to createdAt
        const updatedAt = toDate(c.updatedAt || c.createdAt)

        try {
            await prisma.chat.upsert({
                where: { id: c.id },
                update: {},
                create: {
                    id: c.id,
                    userId: c.userId,
                    type: type as any,
                    title: c.title || 'Untitled',
                    messages: c.messages ?? [],
                    templateId: c.templateId || null,
                    prdDocument: c.prdDocument || null,
                    rcaDocument: c.rcaDocument || null,
                    rcaType: c.rcaType || null,
                    createdAt: toDate(c.createdAt),
                    updatedAt,
                },
            })
            console.log(`  ✅  [${c.type}] "${c.title}"`)
            created++
        } catch (err: any) {
            console.error(`  ❌  "${c.title}": ${err.message}`)
            skipped++
        }
    }

    console.log(`  → ${created} chats imported, ${skipped} skipped`)
    return created
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Starting JSON → PostgreSQL data migration...')
    console.log(`   Source: ${DATA_DIR}`)
    console.log(`   Target: Neon PostgreSQL\n`)

    const t0 = Date.now()

    const users = await migrateUsers()
    const templates = await migrateTemplates()
    const chats = await migrateChats()

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

    console.log('\n─────────────────────────────────────')
    console.log(`✅ Migration complete in ${elapsed}s`)
    console.log(`   Users:     ${users}`)
    console.log(`   Templates: ${templates}`)
    console.log(`   Chats:     ${chats}`)
    console.log('─────────────────────────────────────')
    console.log('\n💡 Tip: run "npm run db:studio" to browse your data in Neon.')
}

main()
    .catch((err) => {
        console.error('\n💥 Migration failed:', err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
