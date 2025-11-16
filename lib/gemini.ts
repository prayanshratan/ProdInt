import { GoogleGenerativeAI } from '@google/generative-ai'
import customInstructions from '../kb/custom-instructions.json'

const DEFAULT_API_KEY = 'AIzaSyDv8MrOUtqOeKU97GRWJBt0CoPxmqa6mYE'

export function getGeminiClient(apiKey?: string) {
  const key = apiKey || DEFAULT_API_KEY
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
  
  let prompt = `${systemInstructions}\n\n`
  prompt += `You are an expert Product Manager tasked with writing a comprehensive Product Requirements Document (PRD).\n\n`
  
  if (template) {
    prompt += `Use the following PRD template structure:\n\n${template}\n\n`
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
  
  prompt += `\nPlease generate a comprehensive PRD based on the above information. Fill in all sections with detailed, specific, and actionable content.`

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

export async function continueConversation(
  apiKey: string | undefined,
  conversationType: 'prd' | 'jira',
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context?: { template?: string; onePager?: string; additionalContext?: string }
): Promise<string> {
  const genAI = getGeminiClient(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const systemInstructions = getSystemInstructions()
  
  let prompt = `${systemInstructions}\n\n`
  
  if (conversationType === 'prd') {
    prompt += `You are an expert Product Manager helping to refine a Product Requirements Document (PRD).\n\n`
    if (context?.template) {
      prompt += `Original template structure:\n${context.template}\n\n`
    }
  } else {
    prompt += `You are an expert Product Manager helping to refine Jira user stories.\n\n`
  }
  
  prompt += `Conversation history:\n`
  conversationHistory.forEach(msg => {
    prompt += `${msg.role}: ${msg.content}\n`
  })
  
  prompt += `\nUser: ${userMessage}\n\n`
  prompt += `Please respond to the user's feedback or request. If they're asking for edits, provide the updated content. If they're providing more context, acknowledge it and update the document accordingly.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

