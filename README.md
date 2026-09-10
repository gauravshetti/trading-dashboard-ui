# TradeFlow Dashboard

A responsive trading-performance dashboard built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Fund Management reads from the local Fund Management API at `http://localhost:7810`.
Start that service before opening the page. To use another API origin:

```bash
VITE_ALLOCATIONS_API_URL=http://localhost:7810 npm run dev
```

The page uses the versioned `/api/v1` allocation endpoints. Historical monthly
snapshots are read-only; publishing configuration changes creates a new default
version through `POST /api/v1/allocations/defaults`.

## Production build

```bash
npm run build
npm run preview
```

The previous `.dc.html` prototype remains in the repository as a reference. The active application starts from `src/main.tsx`.
