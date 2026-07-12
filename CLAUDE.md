# CineWeave Studio Engineering Rules

## Product

Offline-first desktop application for evidence-linked film analysis. Media remains local by default. AI suggestions are previewed and explicitly merged by the user.

## Commands

- Install: `npm ci`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Unit: `npm run test`
- E2E: `npm run test:e2e`
- Build: `npm run build`
- Package smoke: `npm run package:smoke`

Update this section only when commands truly change.

## Architecture boundaries

- `src/main`: privileged Electron code, filesystem, database, jobs, media, AI providers.
- `src/preload`: minimal typed bridge.
- `src/renderer`: unprivileged React UI.
- `src/shared`: schemas, IPC contracts, pure time/domain logic.
- Renderer must never import Node built-ins or main-process modules.
- Main process must validate all IPC input with shared schemas.
- Long-running work belongs in workers/jobs and returns a job ID.

## Data safety

- Store timestamps as integer milliseconds.
- Store asset paths relative to the project directory where possible.
- Wrap multi-entity writes in transactions.
- Create a backup before schema migrations.
- Never overwrite locked human fields during AI merges.
- Cache files are disposable; notes, attachments and database are durable.

## Security

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- No arbitrary IPC channel invocation.
- No shell command construction; use executable plus argument array.
- Prevent path traversal and Zip Slip.
- API keys use OS-protected storage and never appear in logs or exports.
- External URLs open in the system browser after scheme validation.

## Quality

- A bug fix starts with a failing reproduction test.
- Do not weaken tests, lint, types, security flags or validation to pass CI.
- Use generated legal test media; do not commit copyrighted film clips.
- Report exact commands and outcomes. Mark skipped checks.
- Keep components and modules focused. Split only when a current change needs it.

## UI

- Follow design tokens in `src/renderer/styles/tokens.css`.
- Core actions are keyboard reachable.
- Color is never the sole state indicator.
- Every async flow has idle, running, success, empty, canceled and error states.
