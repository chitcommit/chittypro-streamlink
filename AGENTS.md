# Repository Guidelines

## Project Structure & Module Organization
The repository is split into a TypeScript React client, an Express server, and shared contracts. `client/src` hosts the UI, with UI atoms and molecules in `components`, route views under `pages`, reusable hooks in `hooks`, and utilities in `lib`. The backend lives in `server`: `index.ts` bootstraps middleware, `routes/` wraps API handlers, and `streaming.ts` deals with WebSocket and RTSP relay logic. Shared schema and type definitions sit in `shared/schema.ts` and feed both layers. Deployment, sync, and setup helpers live in `scripts/`; environment knobs sit in `config/whitelabel-derail.json`, `drizzle.config.ts`, `tailwind.config.ts`, and `vite.config.ts`.

## Build, Test & Development Commands
Install dependencies with `npm install` and start the dev server on port 5000 via `npm run dev`. Build artefacts with `npm run build` (runs `build:client` and `build:server`) and launch production with `npm run start`. Use `npm run check` for type safety, and manage Drizzle migrations through `npm run db:push`, `npm run db:generate`, and `npm run db:migrate`. Deployment helpers such as `./scripts/deploy-derail.sh full`, `./scripts/deploy-free.sh railway`, and `./scripts/verify-deployment.sh staging` cover hosted workflows.

## Coding Style & Naming Conventions
Use two-space indentation and keep imports sorted roughly by locality, matching the existing code. Prefer double quotes in TypeScript, PascalCase for React components, camelCase for functions/variables, and kebab-case filenames within `client/src/components` and `client/src/pages`. Co-locate feature-specific styling and hooks beside their component; surface shared utilities through `client/src/lib`. No linter is configured, so mirror the current formatting and ensure `npm run check` stays clean.

## Testing Guidelines
No automated suite exists; `npm run test` is a placeholder. Manually verify streaming, PTZ, and guest access flows and log scenarios in the PR. When adding tests, keep them beside the feature (e.g., `client/src/components/camera/__tests__/panel.test.tsx`) and update the npm scripts before merging. Focus early coverage on streaming fallbacks and auth/session paths once a runner is available.

## Commit & Pull Request Guidelines
Follow the existing Git history: concise, imperative commit subjects (e.g., `Add white-label configuration for derail.me integration`). Reference related issues or deployment docs when relevant. PR descriptions should include context, risk assessment, validation steps (`npm run dev`, `npm run db:push`), and media for UI adjustments. Tag both frontend and backend maintainers whenever shared contracts change.

## Security & Configuration Tips
Seed environment variables from `.env.example` and load secrets locally; never commit credentials. Validate RTSP endpoints with `./scripts/recording-manager.sh` before promoting them. Use the provided deployment scripts to keep TLS, session storage, and database URLs consistent across environments.
