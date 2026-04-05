# Landing Page - QuantumAnchor

MagicUI-powered landing page for the Trending News → Medium Pipeline.

## Quick Start

```bash
cd landing-page
npm install
npm run dev
```

Open http://localhost:5173

## Components

### UI Components (MagicUI-based)
- `Button` - Base button with variants
- `PulsatingButton` - Animated pulse effect
- `BorderBeamButton` - Border beam animation
- `BorderBeam` - Decorative border animation

### Sections
- **Hero** - Main landing with gradient text and CTAs
- **LiveFeed** - Real-time trending topics display
- **Features** - 4-column feature grid
- **Pricing** - 3-tier pricing cards

## Configuration

Edit environment variables in `.env`:

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- MagicUI Components
