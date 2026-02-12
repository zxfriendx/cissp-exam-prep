# cissp-app

CISSP exam preparation web application with interactive study features.

## Tech Stack
- Next.js 16 (React framework, static export)
- TypeScript
- Tailwind CSS + ShadCN UI
- Framer Motion (animations)

## Setup
```bash
npm install
npm run dev    # start dev server
npm run build  # production build (static export)
```

## Key Files
- `src/` — React components, pages, and application logic
- `public/` — static assets
- `scripts/` — deployment scripts (gitignored)
- `out/` — static build output (gitignored)

## Development
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Deploy: `npm run deploy` (requires .env.local with FTP credentials)

## Notes
- `.env.local` contains deployment credentials — never commit
- GitHub remote: `cissp-exam-prep`
