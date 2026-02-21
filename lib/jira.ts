import { JiraConfig } from './db'

export interface JiraProject {
    id: string
    key: string
    name: string
    projectTypeKey: string
    avatarUrls: { '48x48': string }
}

export interface ParsedUserStory {
    title: string
    body: string           // Full user story text (As a... / When... / I am able to...)
    acceptanceCriteria: string[]
}

export interface ParsedStories {
    featureTitle: string
    stories: ParsedUserStory[]
}

export interface JiraIssueResult {
    storyKey: string
    storyUrl: string
    tasks: Array<{ key: string; title: string; url: string }>
}

// ---------- Jira REST helpers ----------

function buildHeaders(config: JiraConfig) {
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
    return {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }
}

function baseUrl(config: JiraConfig) {
    const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${domain}`
}

// ---------- Public API functions ----------

/**
 * Verify Jira credentials by calling /myself.
 * Returns the Jira user display name on success.
 */
export async function verifyJiraConnection(config: JiraConfig): Promise<{ valid: boolean; displayName?: string; error?: string }> {
    try {
        const res = await fetch(`${baseUrl(config)}/rest/api/3/myself`, {
            headers: buildHeaders(config),
        })

        if (res.ok) {
            const data = await res.json()
            return { valid: true, displayName: data.displayName }
        }

        if (res.status === 401) {
            return { valid: false, error: 'Invalid credentials. Check your email and API token.' }
        }

        return { valid: false, error: `Jira returned status ${res.status}` }
    } catch (err: any) {
        return { valid: false, error: `Cannot reach Jira. Check your domain: ${err.message}` }
    }
}

/**
 * List all projects accessible to the user.
 */
export async function listJiraProjects(config: JiraConfig): Promise<JiraProject[]> {
    const res = await fetch(`${baseUrl(config)}/rest/api/3/project?expand=projectKeys&maxResults=100`, {
        headers: buildHeaders(config),
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch projects: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    // Jira Cloud returns array directly for /project; server returns { values: [] }
    return Array.isArray(data) ? data : (data.values ?? [])
}

/**
 * Get available issue types for a project (to find "Story" and "Subtask" type IDs).
 */
async function getIssueTypes(config: JiraConfig, projectKey: string): Promise<Record<string, string>> {
    const res = await fetch(`${baseUrl(config)}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`, {
        headers: buildHeaders(config),
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch issue types: ${res.status}`)
    }

    const data = await res.json()
    const project = data.projects?.[0]
    if (!project) throw new Error(`Project ${projectKey} not found`)

    const typeMap: Record<string, string> = {}
    for (const it of project.issuetypes ?? []) {
        typeMap[it.name.toLowerCase()] = it.id
    }
    return typeMap
}

/**
 * Create a single Jira issue and return its key + URL.
 */
async function createIssue(
    config: JiraConfig,
    projectKey: string,
    issueTypeId: string,
    summary: string,
    descriptionAdf: object,
    parentKey?: string
): Promise<{ key: string; url: string }> {
    const body: any = {
        fields: {
            project: { key: projectKey },
            issuetype: { id: issueTypeId },
            summary: summary.substring(0, 255),
            description: descriptionAdf,
        },
    }

    // Set parent for subtasks / child issues
    if (parentKey) {
        body.fields.parent = { key: parentKey }
    }

    const res = await fetch(`${baseUrl(config)}/rest/api/3/issue`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Failed to create issue "${summary}": ${res.status} ${err}`)
    }

    const data = await res.json()
    return {
        key: data.key,
        url: `${baseUrl(config)}/browse/${data.key}`,
    }
}

/**
 * Convert a plain text string to Atlassian Document Format (ADF) for Jira Cloud.
 */
function textToAdf(text: string): object {
    if (!text || text.trim() === '') {
        return {
            version: 1,
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }],
        }
    }

    const lines = text.split('\n').filter(Boolean)
    const content: object[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Bullet list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
            content.push({
                type: 'bulletList',
                content: [
                    {
                        type: 'listItem',
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: trimmed.replace(/^[-*\d.]+\s+/, '') }],
                            },
                        ],
                    },
                ],
            })
        } else {
            content.push({
                type: 'paragraph',
                content: [{ type: 'text', text: trimmed }],
            })
        }
    }

    return { version: 1, type: 'doc', content }
}

// ---------- LLM Output Parser ----------

/**
 * Parse LLM-generated markdown into structured user stories.
 *
 * Expected markdown structure:
 *   ## User Story 1: [Title]
 *   As a ... / When ... / I am able to ...
 *
 *   **Acceptance Criteria:**
 *   - Given... when... then...
 *
 * Falls back gracefully for varied LLM output formats.
 */
export function parseUserStoriesFromMarkdown(markdown: string, featureTitle: string): ParsedStories {
    const stories: ParsedUserStory[] = []

    // Split on ## headings (user story boundaries)
    const sections = markdown.split(/^##\s+/m).filter(s => s.trim())

    for (const section of sections) {
        const lines = section.split('\n')
        const rawTitle = lines[0].trim()
            .replace(/^User Story\s*\d+[:\-–]?\s*/i, '')
            .replace(/\*+/g, '')
            .trim()

        if (!rawTitle) continue

        const body = lines.slice(1).join('\n').trim()

        // Extract acceptance criteria - look for "Acceptance Criteria" section
        const acMatch = body.match(/(?:\*{0,2}Acceptance Criteria[:\*]{0,2})([\s\S]*?)(?=\n#{1,3}\s|\n\*{0,2}Acceptance|\n---|\n\*{0,2}User Story|$)/i)
        const acceptanceCriteria: string[] = []

        if (acMatch) {
            const acBlock = acMatch[1]
            const acLines = acBlock.split('\n')
            for (const line of acLines) {
                const stripped = line.trim().replace(/^[-*•\d.]+\s*/, '').trim()
                if (stripped && stripped.length > 5) {
                    acceptanceCriteria.push(stripped)
                }
            }
        }

        // Body = everything before Acceptance Criteria
        const storyBody = acMatch
            ? body.substring(0, body.indexOf(acMatch[0])).trim()
            : body.trim()

        stories.push({
            title: rawTitle,
            body: storyBody,
            acceptanceCriteria,
        })
    }

    // Fallback: if no ## sections found, treat entire content as one story
    if (stories.length === 0 && markdown.trim()) {
        stories.push({
            title: featureTitle,
            body: markdown.trim(),
            acceptanceCriteria: [],
        })
    }

    return { featureTitle, stories }
}

/**
 * Main function: create Jira Story + Sub-tasks from parsed user stories.
 *
 * Hierarchy:
 *   Story  →  [feature name]
 *     └─ Subtask  →  [user story 1 title]   (description: user story body + AC)
 *     └─ Subtask  →  [user story 2 title]
 *     ...
 */
export async function createJiraTickets(
    config: JiraConfig,
    projectKey: string,
    featureTitle: string,
    markdown: string
): Promise<JiraIssueResult> {
    const parsed = parseUserStoriesFromMarkdown(markdown, featureTitle)

    // Get issue type IDs for this project
    const typeMap = await getIssueTypes(config, projectKey)

    // Determine story and subtask type IDs (Jira project configs vary)
    const storyTypeId = typeMap['story'] ?? typeMap['task'] ?? Object.values(typeMap)[0]
    const subtaskTypeId = typeMap['subtask'] ?? typeMap['sub-task'] ?? typeMap['task'] ?? storyTypeId

    // 1. Create parent Story
    const storySummary = parsed.featureTitle || featureTitle
    const storyDescLines = [`Feature: ${storySummary}`, '', `Contains ${parsed.stories.length} user story/stories.`]
    const { key: storyKey, url: storyUrl } = await createIssue(
        config,
        projectKey,
        storyTypeId,
        storySummary,
        textToAdf(storyDescLines.join('\n'))
    )

    // 2. Create sub-tasks for each user story
    const tasks: JiraIssueResult['tasks'] = []

    for (const story of parsed.stories) {
        // Build description: user story body + acceptance criteria
        const descParts: string[] = []

        if (story.body) {
            descParts.push(story.body)
        }

        if (story.acceptanceCriteria.length > 0) {
            descParts.push('\nAcceptance Criteria:')
            for (const ac of story.acceptanceCriteria) {
                descParts.push(`- ${ac}`)
            }
        }

        const { key, url } = await createIssue(
            config,
            projectKey,
            subtaskTypeId,
            story.title,
            textToAdf(descParts.join('\n')),
            storyKey
        )

        tasks.push({ key, title: story.title, url })
    }

    return { storyKey, storyUrl, tasks }
}
