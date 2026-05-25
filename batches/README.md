# Batch System for Manga Source Implementation

## How It Works

Sources are divided into small batch files of **5 sources each**. No more giant todo list.

```
batches/
├── pending/        ← Pick a file from here
├── in-progress/    ← Move file here when you start
└── complete/       ← Move file here when done
```

## For Agents

### 1. Claim a batch
```bash
# Pick any file from pending/ and move it to in-progress/
mv batches/pending/batch-001.md batches/in-progress/
```

### 2. Work on your 5 sources
Open the batch file. It looks like this:

```markdown
# Batch 1

- [ ] **Source Name** — `https://base-url.com`
- [ ] **Source Name 2** — `https://base-url-2.com`
...

---
Status: pending
```

For each source:
- Test with curl
- Implement in `src/lib/sources/{id}.ts`
- Update the checkbox: `- [✓]` for done, `- [x]` for can't do
- Write the reason next to `- [x]` sources

### 3. Move to complete
```bash
# When all 5 sources are checked, move the file
mv batches/in-progress/batch-001.md batches/complete/
```

### 4. Update index.ts
Register all implemented sources from your batch in `src/lib/sources/index.ts`.

### 5. Verify build
```bash
cd /home/neon/programs/side_project/mangablaze && npx tsc --noEmit
```

## Batch File Naming

| Range | Status |
|-------|--------|
| batch-001.md to batch-080.md | Pending |
| batch-900.md+ | In progress (migrated from old todo) |
| done-batch-*.md | Complete — implemented |
| skipped-batch-*.md | Complete — couldn't implement |

## Counts

Check current status:
```bash
ls batches/pending/ | wc -l     # remaining
ls batches/in-progress/ | wc -l  # active
ls batches/complete/ | wc -l     # done
```
