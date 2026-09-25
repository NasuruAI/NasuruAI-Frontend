# Frontend CI and commit hooks

## Every commit

`git commit` runs `.githooks/pre-commit`:

1. **eslint** (zero warnings) and **prettier** on the staged files, through
   lint-staged, which also handles files that are only partly staged.
2. **TypeScript** over the whole project, because a change in one file can break
   the types of another.

A failing check prints what is wrong and the commit stops. Fix it, `git add`,
commit again.

The hook is versioned in the repository, so every clone and fork has it.
`npm install` and `npm ci` switch it on through the `prepare` script
(`scripts/install-hooks.mjs` sets `core.hooksPath`); there is no setup step to
remember.

## Every push and pull request

`.github/workflows/frontend-ci.yml`. Branch protection requires one check,
**`ci-passed`**, which fails unless every job succeeded.

| Job      | What it checks                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `checks` | `npm ci` from the lockfile; `npm audit` (high and above, production deps); eslint with zero warnings; prettier; `tsc`; WCAG contrast for every token pair in both themes; unit tests |
| `build`  | `next build` succeeds                                                                                                                                                                |

The `checks` job repeats the commit hook's checks over every file, so
`git commit --no-verify`, or a fork without the hook, fails here instead.
Every action is pinned to a full commit SHA.

## Locally

```bash
npm run lint           # eslint
npm run format:check   # prettier
npx tsc --noEmit       # types
npm run check:contrast # WCAG pairs from src/app/globals.css
npm test               # vitest
npm run api:types      # regenerate src/lib/ai/schema.d.ts from the backend (API_SCHEMA=… to override)
```
