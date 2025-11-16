# ProdInt Setup Guide

## Quick Start (Development)

### 1. Install Dependencies

```bash
cd prodint
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

That's it! The application works out of the box with no additional configuration needed.

## Optional Configuration

### JWT Secret (Recommended for Production)

Create a `.env.local` file:

```bash
JWT_SECRET=your-secure-random-secret-key
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using Your Own Gemini API Key

Users can configure their own API keys through the UI:

1. Sign up/Login to ProdInt
2. Go to Settings
3. Enter your Gemini API key
4. Save changes

Get a free API key: [Google AI Studio](https://aistudio.google.com/app/apikey)

## First Time Setup

### 1. Create an Account

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Get started" or "Sign up"
3. Fill in your details:
   - Full Name
   - Email (avoid temporary email addresses)
   - Password (minimum 6 characters)

### 2. Complete Onboarding

After signup, you'll be redirected to the onboarding page:

1. Verify your name (pre-filled)
2. Add company (optional)
3. Add designation (optional)
4. Add Gemini API key (optional but recommended)
5. Click "Complete setup"

### 3. Start Using ProdInt

You'll be redirected to the Dashboard where you can:
- Create PRDs
- Generate User Stories
- Manage Templates
- Update Settings

## Features Available

### PRD Agent

- Create comprehensive PRDs
- Use default or custom templates
- Upload one-pagers (docx, txt, md)
- Chat to refine PRDs
- Download as Markdown or DOCX

### Jira Agent

- Generate user stories
- Acceptance criteria in "Given-When-Then" format
- Custom templates support
- Upload context files
- Download as Markdown or DOCX

### Template Management

- Upload custom PRD templates
- Set default templates
- Support for docx, txt, md files
- Download templates

### Settings

- Update profile information
- Manage Gemini API key
- View account details
- Logout

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Set these in your production environment:

```bash
JWT_SECRET=your-production-secret
NODE_ENV=production
```

### Recommended Production Setup

1. **Database**: Migrate from JSON to PostgreSQL/MongoDB
2. **Storage**: Use cloud storage for file uploads
3. **Security**: 
   - Enable HTTPS
   - Set secure CORS policies
   - Implement rate limiting
4. **Monitoring**: Add logging and error tracking
5. **Backups**: Regular database backups

## Troubleshooting

### Port Already in Use

Change the port:
```bash
PORT=3001 npm run dev
```

### Dependencies Issues

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Reset

Delete the data directory:
```bash
rm -rf data/
```

The database will be recreated on next run.

## File Structure

```
prodint/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── workspace/         # Protected workspace pages
│   ├── onboarding/        # Onboarding flow
│   └── page.tsx          # Landing page
├── components/            # React components
├── lib/                   # Utilities and libraries
├── hooks/                 # React hooks
├── data/                  # JSON database (auto-generated)
└── public/               # Static assets
```

## Support

For issues or questions:
- Check existing documentation
- Review error messages in console
- Ensure all dependencies are installed

## Development Tips

### Hot Reload

Next.js supports hot reload. Changes will automatically refresh the browser.

### TypeScript

The project uses TypeScript for type safety. VS Code provides excellent TypeScript support.

### Linting

Run linter:
```bash
npm run lint
```

### Building

Test production build locally:
```bash
npm run build
npm start
```

---

Happy building! 🚀

