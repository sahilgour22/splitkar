## What changed

<!-- 1-3 bullet points describing the change and why -->

-

## Screenshots / screen recordings

<!-- Required for any UI change. Drag and drop images/videos here. -->

## Testing done

- [ ] Tested on iOS simulator / device
- [ ] Tested on Android emulator / device
- [ ] Tested offline behaviour (if relevant)
- [ ] Golden path works
- [ ] Edge cases checked (empty states, errors, loading states)

## Schema changes

<!-- If you modified the database schema, describe the migration required.
     Copy the SQL to docs/schema.sql and note it here. -->

None

## Checklist

- [ ] No `any` types without an inline justification comment
- [ ] Every new async operation has loading + error states in the UI
- [ ] New components stay under 150 lines (split if larger)
- [ ] No prop drilling > 2 levels (use Zustand or Context instead)
- [ ] New TODOs include `// TODO(name): why` and a note in `docs/roadmap.md`
- [ ] `npm run typecheck` passes locally
- [ ] `npm run lint` passes locally
