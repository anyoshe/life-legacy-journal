# Phase 4 partial — Goal detail, milestones, actions

## What this adds
- `/goals/[id]` detail page
- Add / complete / delete milestones
- Add / complete / delete actions  
- Update progress (numeric goals)
- Change status
- Delete goal (confirmation)
- Goals list cards link to detail

## Files
```
src/app/api/goals/[goalId]/route.ts   REPLACE
src/app/goals/page.tsx                REPLACE
src/app/goals/[id]/page.tsx           CREATE
```

No schema migration required (Milestone + Action models already exist).

## Apply
```bash
export SRC=~/Documents/phase4-goals/life-legacy-journal   # adjust after unzip
export DEST=~/Desktop/life-legacy-journal

cd "$DEST"
mkdir -p "src/app/api/goals/[goalId]" "src/app/goals/[id]"
cp "$SRC/src/app/api/goals/[goalId]/route.ts" "src/app/api/goals/[goalId]/route.ts"
cp "$SRC/src/app/goals/page.tsx" src/app/goals/page.tsx
cp "$SRC/src/app/goals/[id]/page.tsx" "src/app/goals/[id]/page.tsx"
```

## Validate
```bash
npm run build
npm run dev
```
Open /goals → create or open a goal → add milestones and actions.

## Note
Also push Phase 1 journal if not yet on GitHub.
