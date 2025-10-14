# Real-time Tic Tac Toe

A full-stack, real-time multiplayer Tic Tac Toe game built with Next.js, Socket.IO, and Tailwind CSS. Players are paired instantly and can request rematches or jump into new matches with a single click. Designed for fast deployment to Vercel using the included configuration.

## Features

- 🔄 **Live multiplayer** — Socket.IO pairs players automatically and syncs every move instantly.
- 🎮 **Responsive game board** — Optimised for desktop and mobile with clear turn indicators and win highlights.
- 🔁 **Rematch workflow** — Request, accept, or search for new opponents without leaving the page.
- ⚡ **Next.js API route** — WebSocket server hosted alongside the app for easy Vercel deployment.
- 🎨 **Tailwind styling** — Modern glassmorphism-inspired interface with minimal configuration.

## Tech Stack

- Next.js 14 (Pages Router)
- React 18
- Socket.IO (server + client)
- Tailwind CSS 3
- ESLint (Next.js rules)

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the development server**

   ```bash
   npm run dev
   ```

   Then open [http://localhost:3000](http://localhost:3000) to play. Open two tabs or browsers to test real-time play locally.

3. **Build for production**

   ```bash
   npm run build
   npm start
   ```

## Deployment

The repository is ready for Vercel:

- `vercel.json` instructs Vercel to use the Next.js build.
- Socket.IO runs from the `/api/socket` route, which Vercel keeps warm for WebSocket upgrades.

Deploy by connecting the repo to Vercel and importing it as a Next.js project. No additional configuration is required.

## Project Structure

```
tic-tac-toe/
├─ components/
│  └─ GameBoard.js
├─ pages/
│  ├─ _app.js
│  ├─ api/
│  │  └─ socket.js
│  └─ index.js
├─ styles/
│  └─ globals.css
├─ package.json
├─ tailwind.config.js
├─ postcss.config.js
└─ vercel.json
```

## Notes

- Socket rooms and game state live in memory. Restarting the server resets active matches.
- Tailwind and Socket.IO dependencies are bundled; no extra setup steps are required.
- ESLint is available via `npm run lint`.

Enjoy the game! 🎉
