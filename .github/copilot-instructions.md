# Copilot Instructions for studio-web

## What this project is
- A Vite + React + TypeScript web dashboard for a stream studio/admin platform.
- Uses `@arco-design/web-react` for UI and `react-router-dom` v7 for client routing.
- Uses `axios` in `src/utils/request.ts` to call backend APIs under `/api/*`.

## Key architecture
- `src/main.tsx` mounts `<App />`.
- `src/App.tsx` wraps app in `UserProvider` and `ProjectProvider`, then renders `RouterProvider`.
- `src/router/index.tsx` defines public routes (`/`, `/register`, `/basic`) and protected `/stream/*` routes.
- `src/router/RequireAuth.tsx` checks `UserContext`; if no user, redirects to `/`.
- `src/layouts/GlobalLayout.tsx` defines the authenticated app shell with header, project selector, tabs, and `<Outlet />` content area.

## Important state patterns
- `src/context/UserProvider.tsx` loads current user once on mount using token from `localStorage`.
- `src/context/ProjectProvider.tsx` stores project list but does not auto-fetch on mount; `Projects.tsx` triggers `fetchProjects()` explicitly.
- `src/context/useUser.ts` and `src/context/useProjects.ts` are convenience hooks for accessing those contexts.

## API conventions
- All API calls use `src/utils/request.ts`.
- `request` adds `Authorization: Bearer <token>` from `localStorage`.
- `request` intercepts 401/403 globally and redirects to `/` on expired login.
- Backend endpoints use a `res.data.success` convention and return data on `res.data.data`.
- Typical API file shape: `src/api/user.ts`, `src/api/project.ts`, `src/api/cluster.ts`, `src/api/datasource.ts`.

## Build and dev commands
- `npm run dev` starts Vite dev server on `localhost:3000`.
- `npm run build` runs `tsc && vite build`.
- `npm run preview` serves the production build on `localhost:5000`.
- There is no `npm test` script in this repo.

## Project-specific conventions
- UI code uses Arco components with local `style={{}}` inline styling in many layout files.
- Routes under `/stream` are all nested behind `GlobalLayout`.
- `src/pages/Projects.tsx` is the main admin page for project CRUD and membership management.
- `src/layouts/GlobalLayout.tsx` controls whether `ProjectSelector` shows based on pathname matching `/stream/studio` or `/stream/ops`.

## What to inspect first for changes
- `src/router/index.tsx` for route behavior and guarding logic.
- `src/utils/request.ts` for backend base URL, auth header, and error handling.
- `src/context/UserProvider.tsx` and `src/context/ProjectProvider.tsx` for global auth/project state flow.
- `src/layouts/GlobalLayout.tsx` for top-level authenticated UI shell.

## Notes for AI edits
- Avoid adding new global state libraries; this repo is purposefully using plain React context.
- Preserve the `/api` request shape and `res.data.success` handling.
- Prefer editing `src/api/*.ts` functions for endpoint changes instead of hardcoding URLs elsewhere.
- Use the existing `Message` component from Arco for user-facing notifications when adding UI behavior.
