import { GoogleGenerativeAI } from '@google/generative-ai'
import customInstructions from '../kb/custom-instructions.json'

/**
 * Get a Gemini client instance
 * @param apiKey - Optional user-provided API key (from their settings)
 * @returns GoogleGenerativeAI client
 * @throws Error if no API key is available
 */
export function getGeminiClient(apiKey?: string) {
  // Priority: User's API key > Environment variable
  const key = apiKey || process.env.GEMINI_API_KEY
  
  if (!key) {
    throw new Error(
      'No Gemini API key available. Please set GEMINI_API_KEY environment variable or provide your own key in Settings.'
    )
  }
  
  return new GoogleGenerativeAI(key)
}

export function getSystemInstructions(): string {
  return `${customInstructions.content.short_version}

Core Rules:
${Object.entries(customInstructions.content.rules)
  .map(([key, value]) => {
    if (typeof value === 'object') {
      return `${key}:\n${Object.entries(value).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}`
    }
    return `- ${key}: ${value}`
  })
  .join('\n')}`
}

export async function generatePRD(
  apiKey: string | undefined,
  template: string,
  onePager: string,
  additionalContext: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  
  // Detect if template is HTML or Markdown
  const isHtmlTemplate = template && /<[a-z][\s\S]*>/i.test(template)
  
  let prompt = `${systemInstructions}\n\n`
  prompt += `You are an expert Product Manager tasked with writing a comprehensive Product Requirements Document (PRD).\n\n`
  
  if (template) {
    prompt += `Use the following PRD template structure:\n\n${template}\n\n`
    
    // CRITICAL: Tell LLM to match the template format
    if (isHtmlTemplate) {
      prompt += `**CRITICAL FORMATTING REQUIREMENTS:**
- The template above is in HTML format with rich formatting
- You MUST generate your response in HTML format to preserve all formatting
- Maintain the same HTML tags, styles, fonts, colors, and table structures as shown in the template
- Use the exact same heading levels (<h1>, <h2>, <h3>, etc.)
- Preserve table structures with <table>, <tr>, <td> tags
- Keep all inline styles (style="...") to maintain fonts, colors, and formatting
- DO NOT use Markdown syntax (**, *, |, etc.) - use HTML tags instead
- Example: Use <strong>text</strong> NOT **text**, use <em>text</em> NOT *text*
- Example: Use <table> NOT markdown tables with |
- Your output should be valid HTML that can be directly rendered in a document

`
    } else {
      prompt += `**FORMATTING REQUIREMENTS:**
- Generate your response in Markdown format
- Use proper Markdown syntax for formatting
- Use ## for headings, **bold**, *italic*, tables with |, etc.

`
    }
  } else {
    prompt += `**FORMATTING REQUIREMENTS:**
- Generate your response in clean Markdown format
- Use ## for headings, **bold**, *italic*, tables with |, etc.

`
  }
  
  if (onePager) {
    prompt += `Problem Statement and Context (from one-pager):\n${onePager}\n\n`
  }
  
  if (additionalContext) {
    prompt += `Additional Context:\n${additionalContext}\n\n`
  }
  
  if (conversationHistory.length > 0) {
    prompt += `Previous conversation:\n`
    conversationHistory.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += `\n`
  }
  
  prompt += `\nPlease generate a comprehensive PRD based on the above information. Fill in all sections with detailed, specific, and actionable content. Remember to use the EXACT same formatting style as the template provided.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function generateUserStories(
  apiKey: string | undefined,
  context: string,
  template: string | null,
  acceptanceCriteriaFormat: string | null,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  
  let prompt = `${systemInstructions}\n\n`
  prompt += `You are an expert Product Manager tasked with writing Jira user stories.\n\n`
  
  const defaultTemplate = template || 'As a {user-persona} when I {user-flow} I am able to {operation} so that {outcome}'
  prompt += `Use the following user story template:\n${defaultTemplate}\n\n`
  
  const defaultAcceptanceCriteriaFormat = acceptanceCriteriaFormat || 'Given... when... then...'
  prompt += `Each user story must have acceptance criteria in the format: "${defaultAcceptanceCriteriaFormat}"\n\n`
  
  if (context) {
    prompt += `Context for user stories:\n${context}\n\n`
  }
  
  if (conversationHistory.length > 0) {
    prompt += `Previous conversation:\n`
    conversationHistory.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += `\n`
  }
  
  prompt += `\nPlease generate user stories based on the above context. Create as many user stories as needed, each with its own heading and acceptance criteria.

CRITICAL RULE FOR ACCEPTANCE CRITERIA:
- Each acceptance criteria must test ONLY ONE specific condition
- NEVER combine multiple conditions with "and", "or", or "also"
- Split compound conditions into separate acceptance criteria
- Example: Instead of "Given user is logged in, When they click submit, Then form is submitted AND validation passes AND confirmation is shown"
  Write three separate criteria:
  1. Given user is logged in, When they click submit, Then form is submitted
  2. Given user submits form, When validation runs, Then all validations pass
  3. Given form is submitted successfully, When process completes, Then confirmation message is shown
- Each "Given-When-Then" should focus on ONE testable outcome only

If any information is missing, clearly indicate what additional information is needed.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function generateErrorAnalysis(
  apiKey: string | undefined,
  errorLogs: string,
  additionalContext: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  
  let prompt = `${systemInstructions}\n\n`
  prompt += `You are an expert Software Engineer and DevOps specialist tasked with analyzing error logs.\n\n`
  
  prompt += `**CRITICAL RULES:**
- ONLY analyze what is provided in the error logs and context
- DO NOT hallucinate or make assumptions about things not present in the logs
- If information is missing or unclear, explicitly state that
- Provide actionable insights based ONLY on the given data
- If you cannot determine something, say "Cannot determine from provided logs"

**ERROR LOGS:**
${errorLogs}

`

  if (additionalContext) {
    prompt += `**ADDITIONAL CONTEXT:**
${additionalContext}

`
  }
  
  if (conversationHistory.length > 0) {
    prompt += `**Previous conversation:**\n`
    conversationHistory.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += `\n`
  }
  
  prompt += `**Please provide an error analysis with the following structure:**

## Error Summary
A brief overview of the errors found in the logs.

## Error Breakdown
For each distinct error found:
- **Error Type:** [Type of error]
- **Location:** [Where the error occurred, if identifiable]
- **Error Message:** [The actual error message]
- **Likely Cause:** [What probably caused this error based on the logs]

## Root Cause Analysis
Explain the underlying reason(s) for these errors based on the information provided.

## Recommended Solutions
Step-by-step recommendations to resolve these errors.

## Prevention Tips
How to prevent similar errors in the future.

**Remember: Only use information from the provided logs and context. Do not invent details.**`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function generateRCA(
  apiKey: string | undefined,
  errorLogs: string,
  additionalContext: string,
  rcaType: 'user-facing' | 'technical',
  customTemplate: string | null,
  defaultTemplate: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  const template = customTemplate || defaultTemplate
  
  let prompt = `${systemInstructions}\n\n`
  
  if (rcaType === 'user-facing') {
    prompt += `You are an expert Technical Writer and Product Manager tasked with creating a User-Facing Root Cause Analysis (RCA) document.\n\n`
    prompt += `The goal is to communicate the incident clearly to customers/stakeholders in a non-technical, empathetic manner.\n\n`
  } else {
    prompt += `You are an expert Site Reliability Engineer (SRE) and Software Architect tasked with creating a Technical Engineering RCA document.\n\n`
    prompt += `The goal is to provide a detailed technical analysis for internal engineering teams.\n\n`
  }
  
  prompt += `**CRITICAL RULES:**
- ONLY use information from the provided error logs and context
- DO NOT hallucinate or invent incident details, timelines, or metrics
- If a section cannot be filled due to missing information, explicitly state: "[Information not available in provided logs]"
- It is BETTER to leave sections blank than to make up information
- Be factual and precise

**RCA TEMPLATE TO FOLLOW:**
${template}

**ERROR LOGS TO ANALYZE:**
${errorLogs}

`

  if (additionalContext) {
    prompt += `**ADDITIONAL CONTEXT:**
${additionalContext}

`
  }
  
  if (conversationHistory.length > 0) {
    prompt += `**Previous conversation:**\n`
    conversationHistory.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += `\n`
  }
  
  prompt += `**Generate the RCA document following the template structure exactly. Fill in each section with information from the logs and context. For sections where information is not available, clearly indicate "[Information not available]" rather than making assumptions.**`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function continueConversation(
  apiKey: string | undefined,
  conversationType: 'prd' | 'jira' | 'rca',
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context?: { template?: string; onePager?: string; additionalContext?: string; rcaType?: string }
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  
  // Detect format from conversation history (check last assistant message)
  const lastAssistantMessage = [...conversationHistory].reverse().find(msg => msg.role === 'assistant')
  const isHtmlFormat = lastAssistantMessage && /<[a-z][\s\S]*>/i.test(lastAssistantMessage.content)
  
  let prompt = `${systemInstructions}\n\n`
  
  if (conversationType === 'prd') {
    prompt += `You are an expert Product Manager helping to refine a Product Requirements Document (PRD).\n\n`
    if (context?.template) {
      prompt += `Original template structure:\n${context.template}\n\n`
    }
    
    // CRITICAL: Maintain the same format as previous messages
    if (isHtmlFormat) {
      prompt += `**CRITICAL FORMATTING REQUIREMENTS:**
- Your previous responses were in HTML format with rich formatting
- You MUST continue using HTML format in your response
- DO NOT switch to Markdown syntax
- Use HTML tags: <strong>, <em>, <h1>, <h2>, <table>, etc.
- Preserve all inline styles and formatting from previous responses
- Example: Use <strong>text</strong> NOT **text**
- Your output should be valid HTML that matches the previous formatting

`
    }
  } else if (conversationType === 'rca') {
    prompt += `You are an expert Site Reliability Engineer helping to refine a Root Cause Analysis (RCA) document.\n\n`
    prompt += `**CRITICAL RULES:**
- ONLY use information from the provided error logs and context
- DO NOT hallucinate or invent details
- If information is missing, clearly state it
- Maintain the same document structure and format as the previous response
- Be factual and precise

`
    if (context?.rcaType) {
      prompt += `RCA Type: ${context.rcaType}\n\n`
    }
  } else {
    prompt += `You are an expert Product Manager helping to refine Jira user stories.\n\n`
  }
  
  prompt += `Conversation history:\n`
  conversationHistory.forEach(msg => {
    prompt += `${msg.role}: ${msg.content.substring(0, 500)}...\n` // Truncate long messages for context
  })
  
  prompt += `\nUser: ${userMessage}\n\n`
  prompt += `Please respond to the user's feedback or request. If they're asking for edits, provide the updated content in the SAME FORMAT as your previous responses. If they're providing more context, acknowledge it and update the document accordingly while maintaining the same formatting style.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

