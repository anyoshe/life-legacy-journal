# Life & Legacy Journal — Prioritized Feature List

## Philosophy
Ship the smallest thing that lets you + your wife actually use the system daily for 30 days.  
Everything else is secondary until real usage data exists.

---

## Phase 0 — Personal Prototype (ChatGPT Project or simple Next.js)  
**Goal:** Prove you will actually write in it for 30 days.

- [x] Daily check-in form (the lightweight version)
- [x] Private vs Shared toggle
- [x] Basic goal creation (manual)
- [x] Simple weekly review prompt
- [x] AI system prompt loaded

**Success criteria:** You and your wife both use it ≥ 20 days in 30.

---

## Phase 1 — True MVP (v0.1)  
**Target:** Usable web app for one couple.

### Must Have
1. **Auth** — Email magic link or Google (Clerk / NextAuth / Supabase Auth)
2. **Couple linking** — Invite code or email invite → accept → become linked
3. **Daily Entry**
   - Free-form text + structured fields (gratitude, accomplishments, spiritual, marriage, financial, tomorrow priority, prayer)
   - Visibility: Private / Shared with Partner
4. **Goal Engine (basic)**
   - Create goal (area, type, title, why, target, deadline)
   - List active goals
   - Mark actions / milestones complete
   - Simple progress % for numeric goals
5. **AI Analysis on entry submit**
   - Call AI with the permanent system prompt
   - Store summary + suggested areas + micro-action
6. **Dashboard (home)**
   - Today’s priority
   - Active goals at a glance (on track / needs attention)
   - Recent shared entries from partner
   - Quick “Add Daily Entry” button
7. **Weekly Review page**
   - Auto-pull last 7 days of entries + goals
   - AI-generated weekly summary
   - User can edit / save
8. **Basic privacy enforcement**
   - Private entries never visible to partner
   - Shared entries visible to both

### Nice-to-have in v0.1 (only if time)
- Habit tracking (simple yes/no per day)
- Media upload (photos)
- Mobile-responsive design (must work well on phone)

**Out of scope for MVP:**  
Annual reviews, letters vault, full hierarchy cascading, advanced AI memory editing, notifications system, family accounts, public sharing, mobile native app.

---

## Phase 2 — v0.2 (after 30–60 days of real use)
- Goal hierarchy (parent → child)
- Habit streaks + frequency goals
- Monthly Review
- Partner support request (safe notification)
- Letters (to wife / future self)
- Life Scorecard (monthly snapshot)
- Export (JSON + Markdown)
- Better AI pattern detection across longer history

---

## Phase 3 — v1.0
- Annual Life Review
- Achievement archive with evidence
- Voice-to-entry
- Offline support / PWA
- Family section (children)
- Goal Inbox (“I want to…”)
- Deeper AI coaching + adaptive goal suggestions
- Printable Year-in-Review / Legacy book

---

## Phase 4 — Growth / Platform
- Coach / mentor workspaces
- Optional Growth Circles (small private groups)
- Template marketplace (Bible studies, financial roadmaps, marriage exercises)
- White-label for churches / coaches
- Multi-language

---

## Technical Priorities for MVP
1. Neon PostgreSQL + Prisma (schema already provided)
2. Next.js App Router + TypeScript + Tailwind + shadcn/ui
3. Auth (recommend Clerk for speed)
4. AI: OpenAI or Anthropic (start with one model)
5. File storage: Cloudflare R2 or Uploadthing (later)
6. Deploy: Vercel

---

## Definition of Done for MVP
- You can invite your wife
- Both of you can write private and shared daily entries
- AI gives useful structured feedback on every entry
- You can create and tick goals
- Dashboard shows the important things at a glance
- Private data stays private
- The whole thing is usable on a phone browser
