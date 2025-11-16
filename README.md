# ProdInt - AI-Powered Product Management Assistant

ProdInt is an enterprise-grade AI assistant designed to help Product Managers create comprehensive Product Requirements Documents (PRDs) and Jira user stories efficiently.

## Features

### 🚀 Core Features

- **PRD Generation**: Create comprehensive PRDs using AI with customizable templates
- **User Story Creation**: Generate Jira-ready user stories with acceptance criteria
- **Template Management**: Upload, manage, and set default PRD templates
- **AI-Powered**: Leverages Google Gemini AI with zero-hallucination policies
- **Chat Persistence**: Save conversations and resume later
- **Document Export**: Download PRDs and user stories as markdown files

### 🔐 Security & Authentication

- Username/password authentication
- Email validation with temporary email blocking
- Personal vs corporate email detection
- Secure API key storage (user-provided or default)

### ⚙️ User Management

- User onboarding flow
- Profile management
- API key configuration
- Workspace settings

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **AI**: Google Gemini API
- **Authentication**: JWT with HTTP-only cookies
- **Database**: File-based JSON storage (easily upgradeable to SQL/NoSQL)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd prodint
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables (Optional)

Create a `.env.local` file in the root directory:

```env
JWT_SECRET=your-secret-key-here
```

Note: A default Gemini API key is included for testing. Users can provide their own API keys for better rate limits.

## Project Structure

```
prodint/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── ai/             # AI generation endpoints
│   │   ├── chats/          # Chat management
│   │   ├── templates/      # Template management
│   │   └── user/           # User management
│   ├── workspace/          # Main application pages
│   │   ├── prd/           # PRD Agent
│   │   ├── jira/          # Jira Agent
│   │   ├── templates/     # Template management
│   │   └── settings/      # User settings
│   ├── onboarding/        # Onboarding flow
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Landing page
│   └── globals.css       # Global styles
├── components/            # React components
│   └── ui/               # UI components
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication utilities
│   ├── db.ts            # Database operations
│   ├── gemini.ts        # Gemini AI integration
│   └── utils.ts         # Helper functions
├── hooks/               # React hooks
└── data/               # JSON database files (auto-generated)
```

## Usage

### Creating a PRD

1. Navigate to the PRD Agent
2. Click "New PRD"
3. Provide:
   - Title
   - Template (optional)
   - One-pager/problem statement (optional)
   - Additional context (optional)
4. The AI will generate a comprehensive PRD
5. Continue the conversation to refine the PRD
6. Download the final PRD as a markdown file

### Generating User Stories

1. Navigate to the Jira Agent
2. Click "New User Story"
3. Provide:
   - Title
   - Context/requirements
   - Custom template (optional)
4. The AI will generate user stories with acceptance criteria
5. Refine through conversation
6. Download user stories

### Managing Templates

1. Navigate to Templates
2. Upload existing templates or create new ones
3. Set a default template for PRD generation
4. Download or delete templates as needed

## API Keys

### Using Your Own Gemini API Key

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Go to Settings in ProdInt
3. Enter your API key
4. Save changes

Benefits:
- Better rate limits
- Your data stays under your Google account
- Supports the free product

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deployment Checklist

- [ ] Set strong `JWT_SECRET` environment variable
- [ ] Configure production database (PostgreSQL/MongoDB recommended)
- [ ] Set up proper CORS policies
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Back up user data regularly

## Database Migration

The current implementation uses file-based JSON storage. For production, migrate to a proper database:

1. **PostgreSQL**: Use Prisma or pg
2. **MongoDB**: Use Mongoose
3. **Supabase**: Use Supabase client

Update `lib/db.ts` with your chosen database adapter.

## Custom Instructions

The AI uses custom instructions from `kb/custom-instructions.json` to ensure:
- No hallucinations
- Accurate, verifiable responses
- Proper handling of missing information
- Enterprise-grade reliability

## Contributing

This is a production-ready codebase with:
- ✅ Modular architecture
- ✅ TypeScript for type safety
- ✅ Clean code principles
- ✅ Reusable components
- ✅ Comprehensive error handling
- ✅ Secure authentication
- ✅ Responsive design

## Support

For issues or questions, please contact the development team.

## License

Proprietary - All rights reserved

---

Built with ❤️ for Product Managers

