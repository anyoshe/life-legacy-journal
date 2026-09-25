# Life & Legacy Journal

AI-powered personal growth + marriage journal with hierarchical SMART goals, private/shared reflections, and lifelong reviews.

> “Become a better man while building a meaningful life with the people you love.”

---

## Quick Start (Local Development)

### 1. Clone / Download this project

```bash
# If you already pushed to GitHub:
git clone https://github.com/YOUR_USERNAME/life-legacy-journal.git
cd life-legacy-journal
```

Or just download the folder I generated and `cd` into it.

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Neon PostgreSQL

1. Go to [https://console.neon.tech](https://console.neon.tech) → **New Project**
2. Name: `life-legacy-journal`
3. Copy the connection string
4. Create `.env.local` in the project root:

```env
# .env.local  (NEVER commit this file)
DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"

# Optional (recommended for Prisma migrations with Neon pooling)
DIRECT_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"

# Auth (choose one later)
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
# CLERK_SECRET_KEY=...
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# AI
OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY=...
```

### 4. Generate Prisma Client & push schema

```bash
npx prisma generate
npx prisma db push
# or for production migrations later:
# npx prisma migrate dev --name init
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to put this on GitHub (safe way)

**Do this on your own machine:**

```bash
cd life-legacy-journal

# Initialize git (if not already)
git init

# Create .gitignore if missing (it should already be there)
# Make sure .env* and node_modules are ignored

git add .
git commit -m "Initial scaffold: Life & Legacy Journal

- Full Prisma schema for Neon
- AI system prompt
- MVP feature list
- Next.js + TypeScript + Tailwind base"

# Create the empty private repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/life-legacy-journal.git
git branch -M main
git push -u origin main
```

**Never** put your Neon connection string, OpenAI key, or GitHub tokens in the repo or in chat.

---

## Project Structure

```
life-legacy-journal/
├── prisma/
│   └── schema.prisma          ← Full database schema
├── docs/
│   ├── AI_SYSTEM_PROMPT.md    ← Permanent AI instructions
│   └── MVP_FEATURE_LIST.md    ← Prioritized roadmap
├── src/
│   ├── app/                   ← Next.js App Router
│   ├── components/
│   ├── lib/                   ← prisma client, AI helpers, utils
│   └── types/
├── .env.local                 ← Your secrets (gitignored)
├── package.json
└── README.md
```

---

## Next Steps After This Scaffold

1. Add authentication (Clerk is fastest)
2. Create the basic daily entry form
3. Wire the AI call using the system prompt in `docs/AI_SYSTEM_PROMPT.md`
4. Build the couple invite flow
5. Dashboard + goal list

I can generate the next set of files (Prisma client helper, basic UI components, API routes, etc.) as soon as you confirm the repo is on GitHub and you have Neon connected.

Just tell me:
- “Repo is live at https://github.com/…”
- “Neon is ready”
and we continue building feature by feature.
