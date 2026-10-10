# Vision → Goals → Scheduled Actions

## Concept
```
VISION + MISSION + VALUES  (/foundation)
        ↓
   GOALS by life area      (/goals — Marriage, Finance, …)
        ↓
   MILESTONES + ACTIONS    (/goals/[id])
        ↓
   Check off action        → updates goal progress (numeric / frequency / yes-no)
```

## New pieces
1. `/foundation` — vision, mission, core values, personal rules (User fields already in DB)
2. Action schedule: ONCE | DAILY | WEEKDAYS | WEEKLY + optional time
3. Action completion contributes to goal `currentValue` by goal type
4. Recurring actions use daily logs (not permanent complete)

## Schema (required)

1. In `prisma/schema.prisma`, replace the `Action` model and add `ActionRecurrence` + `ActionLog` as in `prisma/SCHEMA_PATCH_ACTIONS.md`.

2. Apply migration:
```bash
# copy migration folder from this package first
npx prisma migrate deploy
# or:
npx prisma migrate dev
npx prisma generate
```

## Files to copy
```
src/app/api/foundation/route.ts
src/app/foundation/page.tsx
src/lib/goal-progress.ts
src/app/api/goals/[goalId]/route.ts
src/app/goals/[id]/page.tsx
prisma/migrations/20260930180000_action_schedule_and_logs/migration.sql
prisma/SCHEMA_PATCH_ACTIONS.md
docs/VISION_ACTIONS_APPLY.md
```

## Optional nav
On dashboard header, add:
`<Link href="/foundation">Foundation</Link>`
`<Link href="/entries">Journal</Link>`

## Flow to try
1. `/foundation` — write vision + mission
2. `/goals` — create goal area MARRIAGE or FINANCIAL, type NUMERIC or FREQUENCY
3. Open goal — add Daily action with time + contribution amount
4. Check action → currentValue increases
