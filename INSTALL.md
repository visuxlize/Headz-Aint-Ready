# Installation Instructions

## What You Got

You downloaded `saas-starter-kit.tar.gz` - a complete, production-ready SaaS starter kit!

## What's Inside

- ✅ Next.js 14+ with App Router
- ✅ Supabase Authentication & Database
- ✅ Drizzle ORM (type-safe database)
- ✅ TypeScript & Tailwind CSS
- ✅ Pre-configured Cursor AI rules
- ✅ Complete documentation
- ✅ Example components and API routes

## Quick Install (3 steps)

### Step 1: Extract the Archive

**Mac/Linux:**
```bash
tar -xzf saas-starter-kit.tar.gz
cd saas-starter-kit
```

**Windows (using WSL or Git Bash):**
```bash
tar -xzf saas-starter-kit.tar.gz
cd saas-starter-kit
```

**Windows (using 7-Zip or WinRAR):**
- Right-click `saas-starter-kit.tar.gz`
- Extract to folder
- Open folder in terminal

### Step 2: Open in Your Code Editor

```bash
# If using VS Code
code .

# If using Cursor
cursor .
```

### Step 3: Follow the Quick Start

Open `QUICKSTART.md` and follow the 5-minute setup guide!

## What to Read First

1. **QUICKSTART.md** - Get running in 5 minutes (START HERE!)
2. **README.md** - Complete documentation
3. **CURSOR_GUIDE.md** - How to use with Cursor AI
4. **DEPLOYMENT.md** - Deploy to production

## File Structure

```
saas-starter-kit/
├── 📚 Documentation
│   ├── README.md          ← Complete guide
│   ├── QUICKSTART.md      ← Start here!
│   ├── CURSOR_GUIDE.md    ← AI development tips
│   ├── DEPLOY_NETLIFY.md  ← Deploy to Netlify
│   └── FILETREE.md        ← File structure explained
│
├── 📱 Application Code
│   ├── app/               ← Next.js pages & routes
│   ├── components/        ← Reusable components
│   ├── lib/               ← Database & Supabase
│   └── public/            ← Static assets
│
├── ⚙️ Configuration
│   ├── .cursorrules       ← AI instructions (important!)
│   ├── .env.example       ← Environment template
│   ├── package.json       ← Dependencies
│   └── *.config.*         ← Various configs
│
└── 🔧 Scripts
    └── setup.sh           ← Project creation script
```

## Prerequisites

Before starting, make sure you have:

- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **Git** - [Download here](https://git-scm.com/)
- ✅ **Code Editor** - [VS Code](https://code.visualstudio.com/) or [Cursor](https://cursor.sh/)
- ✅ **Supabase Account** - [Sign up free](https://supabase.com/)

### Check Your Node Version

```bash
node --version
# Should show v18.x.x or higher
```

If you need to update Node.js:
- **Mac/Linux:** Use [nvm](https://github.com/nvm-sh/nvm)
- **Windows:** Download from [nodejs.org](https://nodejs.org/)

## Creating Multiple Projects

You can use this template for multiple projects!

### Method 1: Manual Copy

```bash
# Copy the folder
cp -r saas-starter-kit my-new-project
cd my-new-project

# Remove old git history
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "Initial commit"
```

### Method 2: Use Setup Script

```bash
cd saas-starter-kit
./setup.sh my-new-project
cd my-new-project
```

The setup script automatically:
- Creates a copy
- Initializes git
- Creates `.env.local`
- Shows next steps

## Common First-Time Issues

### "Command not found: npm"

**Solution:** Install Node.js from [nodejs.org](https://nodejs.org/)

### "Permission denied" on setup.sh

**Solution:**
```bash
chmod +x setup.sh
./setup.sh my-project
```

### Can't extract .tar.gz on Windows

**Solutions:**
1. Use WSL (Windows Subsystem for Linux)
2. Install [7-Zip](https://www.7-zip.org/)
3. Install [Git Bash](https://git-scm.com/)

### Port 3000 already in use

**Solution:** Kill the process or use different port
```bash
# Use different port
npm run dev -- -p 3001

# Or find and kill process on port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Getting Help

If you run into issues:

1. **Check the docs** - README.md has troubleshooting section
2. **Review examples** - Look at existing code in `app/api/profile/`
3. **Ask Cursor AI** - Open in Cursor and ask questions
4. **Check configuration** - Verify `.env.local` is correct

## What Makes This Special

This isn't just a template - it's a **complete development system**:

1. **`.cursorrules` file** - Teaches AI your exact architecture
2. **Type-safe everything** - TypeScript + Drizzle ORM
3. **Production-ready** - Auth, database, API routes all configured
4. **Well-documented** - Every file explained
5. **Cursor-optimized** - Build features in minutes, not hours

## Your First 30 Minutes

Here's what you should do:

**Minutes 0-5:** Extract and open in editor
**Minutes 5-10:** Read QUICKSTART.md
**Minutes 10-15:** Set up Supabase account
**Minutes 15-20:** Configure .env.local
**Minutes 20-25:** Install deps and run dev server
**Minutes 25-30:** Test signup/login, explore dashboard

After that, you're ready to start building! 🚀

## Next Steps After Setup

1. **Read CURSOR_GUIDE.md** - Learn how to build with AI
2. **Customize branding** - Update app name, colors, etc.
3. **Add your first feature** - Try building a simple CRUD feature
4. **Deploy to Netlify** - Follow DEPLOY_NETLIFY.md

## Support

- **Documentation:** Everything is in the docs folder
- **Examples:** Check `app/api/profile/route.ts` for patterns
- **AI Help:** Cursor knows your architecture via `.cursorrules`

## License

MIT - Use this for any project you want!

---

**Ready to build?** Open `QUICKSTART.md` and let's go! 🎉
