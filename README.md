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

# Couple invitation email (required to deliver invitation links)
RESEND_API_KEY=re_...
EMAIL_FROM="Life & Legacy <invitations@example.com>"
NEXT_PUBLIC_APP_URL=https://your-application.example

# AI
OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY=...
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

Use reviewed Prisma migrations to evolve the database. Do not use `prisma db push`
against a deployed database.

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

## Privacy and Couple Invitations

Journal entries and goals are private by default. Being partners does not grant
access to private content; only resources explicitly marked as shared with an
active couple are visible to the other member.

An authenticated user can invite someone by email using
`POST /api/couples/invitations`. Valid email addresses receive the same generic
response whether or not the address has a registered account. For registered
users, the app emails a seven-day, one-time link; the recipient must sign in or
create an account with that verified email address to accept or reject. The
email is delivered through Resend, so configure `RESEND_API_KEY`, a verified
`EMAIL_FROM` sender, and the absolute application origin in `NEXT_PUBLIC_APP_URL`.
Invitation emails contain no journal or goal content. A couple relationship
becomes active only after the intended recipient accepts. Personal journal
entries remain private unless explicitly shared.

Run the API authorization and invitation tests with:

```bash
npm test
```

These tests exercise the API handlers with mocked Prisma calls. PostgreSQL
integration tests are pending until a dedicated isolated test database URL is
configured; the normal application database is not used for test writes.
