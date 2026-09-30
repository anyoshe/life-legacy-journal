# Phase 1 — Journal: Apply checklist

## Roadmap compliance

| Requirement | Done |
|-------------|------|
| View previous entries | Yes — `/entries` |
| Browse chronologically | Yes — `createdAt desc` |
| Search entries | Yes — `q` on content, title, mood, lesson |
| Filter by date | Yes — `from` / `to` |
| Filter by entry type | Yes |
| Filter by mood | Yes |
| Filter by visibility | Yes — PRIVATE / SHARED / ALL |
| Filter by tags | Partial — tags shown; search covers text (no dedicated tag chip filter yet) |
| Open an entry | Yes — `/entries/[id]` |
| Edit entry (owner only, server-side) | Yes — full structured fields via PATCH |
| Delete with confirmation (owner only) | Yes |
| Created/updated timestamps | Yes |
| Private vs shared clarity | Yes — badges + privacy-colored cards |
| Pagination (not unlimited load) | Yes — page size 20 |
| Partner can read shared, not edit/delete | Yes |
| No schema migration required | Yes |
| Existing auth/couple privacy preserved | Yes |

## Files

```
src/app/api/entries/route.ts          REPLACE
src/app/api/entries/[entryId]/route.ts  REPLACE
src/app/entries/page.tsx              CREATE
src/app/entries/[id]/page.tsx         CREATE
docs/IMPLEMENTATION_STATUS.md         CREATE
```

## Copy commands

```bash
cd ~/Desktop/life-legacy-journal

# After unzipping phase1-journal.zip:
cp path/to/unzipped/src/app/api/entries/route.ts src/app/api/entries/
mkdir -p "src/app/api/entries/[entryId]" "src/app/entries/[id]"
cp "path/to/unzipped/src/app/api/entries/[entryId]/route.ts" "src/app/api/entries/[entryId]/"
cp path/to/unzipped/src/app/entries/page.tsx src/app/entries/
cp "path/to/unzipped/src/app/entries/[id]/page.tsx" "src/app/entries/[id]/"
mkdir -p docs
cp path/to/unzipped/docs/IMPLEMENTATION_STATUS.md docs/
cp path/to/unzipped/docs/PHASE1_APPLY.md docs/
```

## Privacy test fix (required)

In `tests/privacy-api.test.ts`, change every:

```ts
const response = await getEntries();
```

to:

```ts
const response = await getEntries(
  new NextRequest("http://localhost/api/entries"),
);
```

(`NextRequest` is already imported in that file.)

## Optional UX

1. After save in `src/app/entry/new/page.tsx`:
   ```ts
   router.push("/entries");
   ```
2. Dashboard nav: link **Journal** → `/entries`

## Validate

```bash
npm test
npm run lint
npm run build
```

Manual:
1. Write entry at `/entry/new`
2. Open `/entries` — see it listed
3. Open entry — edit, save, delete with confirm
4. Shared entry: partner reads only; cannot PATCH/DELETE

## Commit

```bash
git add src/app/api/entries src/app/entries docs/IMPLEMENTATION_STATUS.md docs/PHASE1_APPLY.md
# if you updated tests:
git add tests/privacy-api.test.ts

git commit -m "Phase 1 journal: history, detail, edit, delete

- Paginated/filtered GET /api/entries
- Full structured-field PATCH on entries/[id]
- /entries history with search and filters
- /entries/[id] detail, owner edit, confirmed delete
- Owner-only mutate; shared read privacy preserved"

git push
```
