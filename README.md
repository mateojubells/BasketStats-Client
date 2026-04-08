# 🏀 BasketStats-Client

A modern web application for visualization, analysis, and scouting of basketball statistics from the FEB (Spanish Basketball Federation). Built with Next.js, TypeScript, and Tailwind CSS.

## 📋 Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Features](#features)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Related Repository](#related-repository)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 📖 Introduction

**BasketStats-Client** is a basketball analytics platform designed for:

- **Scouts**: Defensive analysis, synergy comparisons, identification of key threats
- **Analysts**: Player trends, clutch-time analysis, the four factors of basketball
- **Coaches**: Full-game visualization, shooting charts, team schedules
- **Fans**: KPI dashboard, real-time statistics, win predictions

The application connects exclusively to **Supabase** for data reading, providing a clear separation between the frontend and data management (handled by [BasketStats-Admin](https://github.com/...)).

### 🎯 Use Cases

- Pre-game analysis: Scouting and defensive matchups
- Live analysis: Play-by-play, box scores, and shooting charts
- Player tracking: Trends, impact, dashboards
- AI queries: HoopsAI ChatBot for quick stats questions

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.17 or higher
- **pnpm**: v8 or higher (recommended) or npm/yarn
- Access to **Supabase** credentials (FEB project)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/BasketStats-Client.git
cd BasketStats-Client
```

### 2. Install dependencies

```bash
pnpm install
```

Or with npm:

```bash
npm install
```

### 3. Configure environment variables

Copy the `.env.example` file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values (see [Environment Variables](#environment-variables)):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API (for HoopsAI Chatbot)
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=UA-...
```

### Variable Description

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public client) | ✅ |
| `NEXT_PUBLIC_OPENAI_API_KEY` | OpenAI API key for chatbot | ✅ |
| `NEXT_PUBLIC_ANALYTICS_ID` | Google Analytics ID | ❌ |

⚠️ **Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed in the browser. **Never include sensitive secrets** (private tokens, admin keys).

---

## 📁 Project Structure

```text
BasketStats-Client/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page (dashboard)
│   ├── login/                   # Authentication
│   ├── player/                  # Player analysis
│   ├── teams/                   # Team management
│   ├── game-center/             # Game visualization
│   ├── scouting/                # Scouting tools
│   ├── calendar/                # Match calendar
│   ├── chat/                    # HoopsAI chat
│   └── api/chat/                # Internal chatbot API
│
├── components/                   # Reusable React components
│   ├── ui/                      # Base components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   └── [others...]
│   ├── dashboard/               # Dashboard components
│   ├── game-center/             # Game visualization components
│   ├── player/                  # Player analysis components
│   ├── scouting/                # Scouting components
│   ├── teams/                   # Team components
│   ├── chatbot/                 # HoopsAI chatbot
│   └── [main components]
│
├── hooks/                       # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
│
├── lib/                         # Utilities and configuration
│   ├── api.ts                   # API client (Supabase queries)
│   ├── supabase.ts              # Supabase configuration
│   ├── auth-context.tsx         # Authentication context
│   ├── types.ts                 # Shared TypeScript types
│   ├── utils.ts                 # General utilities
│   ├── ai-service.ts            # OpenAI integration
│   ├── data.ts                  # Mock/transformation data
│   └── gemini.ts                # Gemini services (if applicable)
│
├── tailwind.config.ts           # Tailwind CSS v4 configuration
├── next.config.mjs              # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

---

## ⚙️ Available Scripts

```bash
# Development
pnpm dev              # Starts server at http://localhost:3000

# Production
pnpm build            # Builds for production
pnpm start            # Starts production server

# Analysis and Quality
pnpm lint             # Runs ESLint
pnpm type-check       # Checks TypeScript types

# Cleanup
pnpm clean            # Cleans .next and node_modules
```

### Usage Examples

```bash
# Development with hot-reload
pnpm dev

# Build and verify errors before deployment
pnpm build && pnpm start

# Verify types before commit
pnpm type-check && pnpm lint
```

---

## 🏗️ Architecture

### Data Flow

```text
Frontend (Next.js/React)
       ↓
   lib/api.ts (Supabase Client)
       ↓
   Supabase (PostgreSQL)
       ↓
   BasketStats-Admin (handles inserts/updates)
```

### Design Principles

1. **Read-Only**: BasketStats-Client **only reads** from Supabase. It does not insert, update, or delete data.
2. **Separation of Responsibilities**: [BasketStats-Admin](https://github.com/your-username/BasketStats-Admin) manages data; this repo only visualizes it.
3. **Strong Typing**: TypeScript in 100% of the code for maximum safety.
4. **Modular Components**: shadcn/ui + custom components, easy to maintain and reuse.

### Key Modules

- **`lib/api.ts`**: Encapsulates all Supabase queries. Central point for data structure changes.
- **`lib/auth-context.tsx`**: Handles user sessions via Supabase Auth.
- **`components/ui/chart.tsx`**: Recharts wrapper with custom styles.
- **`components/chatbot/hoops-ai-chat.tsx`**: OpenAI integration for stats queries.

---

## ✨ Features

### 📊 Dashboard
- Player and team KPIs
- Real-time trend charts
- Upcoming games summary
- Player of the week

### 🎯 Game Analysis
- **Box Score**: Full player-by-player statistics
- **Play-by-Play**: Moment-by-moment game timeline
- **Shooting Charts**: Shot effectiveness charts (FEB)
- **Scoring Runs**: Scoring streaks
- **Win Probability**: Real-time win prediction

### 👤 Player Analysis
- Historical trends (points, rebounds, assists)
- **Clutch Time** analysis (last decisive 5 minutes)
- **Impact Score**: Aggregated impact metrics
- **Skill Analysis**: Specific skill breakdowns
- Synergy comparison with teammates

### 🔍 Advanced Scouting
- **Defensive Analysis**: Defensive gaps by position
- **Synergy Comparison**: How players perform together
- **Key Threats**: Identification of top scorers
- **Matchup History**: Performance in previous matchups
- **Four Factors Analysis**: Offensive efficiency, rebounding, turnovers, free throws

### ⚙️ Team Management
- Rosters and lineups
- Aggregated stats analysis
- Team-level shooting charts
- Lineup analysis

### 📅 Calendar
- Upcoming and past games
- Team/date filtering
- Game-center integration

### 💬 HoopsAI Chatbot
- Natural language stat queries
- OpenAI GPT-4 integration
- Supabase data context
- Team/player-customized responses

---

## 🔌 API Integration

### `lib/api.ts` Structure

BasketStats-Client’s API layer encapsulates all Supabase queries:

```typescript
import { supabase } from './supabase';

// Example: Get player statistics
export async function getPlayerStats(playerId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*, games(*)')
    .eq('id', playerId);
  
  if (error) throw new Error(error.message);
  return data;
}

// Example: Get game box score
export async function getGameBoxScore(gameId: string) {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('game_id', gameId);
  
  if (error) throw new Error(error.message);
  return data;
}
```

### Add a New Query

1. **Define the type in `lib/types.ts`**:

```typescript
export interface PlayerTendency {
  date: string;
  points: number;
  rebounds: number;
  assists: number;
}
```

2. **Add the function in `lib/api.ts`**:

```typescript
export async function getPlayerTendencies(playerId: string) {
  const { data, error } = await supabase
    .from('player_tendencies')
    .select('*')
    .eq('player_id', playerId)
    .order('date', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data as PlayerTendency[];
}
```

3. **Use it in a component**:

```typescript
import { getPlayerTendencies } from '@/lib/api';

export default function TrendsComponent({ playerId }: { playerId: string }) {
  const [data, setData] = useState<PlayerTendency[]>([]);

  useEffect(() => {
    getPlayerTendencies(playerId).then(setData);
  }, [playerId]);

  return <Chart data={data} />;
}
```

### Data Structure Changes

If **BasketStats-Admin** modifies the Supabase table structure:

1. Update types in `lib/types.ts`
2. Modify queries in `lib/api.ts`
3. Update components that use that data
4. Run `pnpm type-check` to validate

---

## 🚀 Deployment

### Deploy on Vercel (Recommended)

1. **Connect your repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Select your GitHub repository

2. **Configure environment variables**:
   - Go to Settings → Environment Variables
   - Add variables from `.env.local`:
     ```text
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     NEXT_PUBLIC_OPENAI_API_KEY
     ```

3. **Deploy**:
   ```bash
   git push origin main
   ```
   Vercel automatically builds and deploys.

### Deploy with Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

Deploy:

```bash
docker build -t basketstats-client .
docker run -e NEXT_PUBLIC_SUPABASE_URL=... -p 3000:3000 basketstats-client
```

---

## 🤝 Contributing

We welcome contributions 💙. Follow these steps:

### Workflow

1. **Fork** the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
3. Make changes and test:
   ```bash
   pnpm dev
   ```
4. Check types and lint:
   ```bash
   pnpm type-check && pnpm lint
   ```
5. Commit with descriptive messages:
   ```bash
   git commit -m "feat: add clutch-time analysis"
   ```
6. Push and create a Pull Request:
   ```bash
   git push origin feature/my-feature
   ```

### Conventions

- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` - New functionality
  - `fix:` - Bug fix
  - `docs:` - Documentation changes
  - `style:` - Formatting (no logic changes)
  - `refactor:` - Refactoring
- **Components**: Use PascalCase, define props with interfaces
- **Files**: Use kebab-case for filenames

---

## 🔗 Related Repository

**[BasketStats-Admin](https://github.com/your-username/BasketStats-Admin)** (Data Administration)

- **Language**: Python + Streamlit
- **Responsibility**: Data insertion, updates, and validation
- **Data**: Communicates exclusively with Supabase

**Separation Note**: BasketStats-Client and BasketStats-Admin are **independent** repositories without code coupling. Communication happens only through Supabase. This enables:
- Independent scalability
- Changes in Admin without affecting Client
- Teams working in parallel

---

## 🛠️ Troubleshooting

### ❌ Error: "Supabase not configured"

**Cause**: Missing environment variables.

**Solution**:
```bash
# Check that .env.local exists and contains:
cat .env.local
# It must include NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Restart server
pnpm dev
```

### ❌ Error: "Authentication failed"

**Cause**: Incorrect Supabase credentials or expired session.

**Solution**:
```bash
# Check credentials in Supabase Dashboard
# Clear local cache
rm -rf .next node_modules
pnpm install
pnpm dev
```

### ❌ Error: "Module not found"

**Cause**: Incomplete dependencies or incompatible Node.js version.

**Solution**:
```bash
# Check Node.js v18+
node --version

# Reinstall dependencies
pnpm install
pnpm build
```

### ❌ Components are not updating

**Cause**: Hot reload failure or browser cache.

**Solution**:
```bash
# Hard refresh in browser (Ctrl+Shift+R or Cmd+Shift+R)
# Or clear Next.js cache
rm -rf .next
pnpm dev
```

### ❌ TypeScript errors

**Cause**: Outdated types or Supabase changes.

**Solution**:
```bash
# Regenerate/check Supabase types
pnpm type-check

# If there are mismatches, update lib/types.ts
# Make sure Supabase columns match types
```

---

## 📄 License

This project is licensed under the **MIT** License. See [LICENSE](./LICENSE) for more details.

---

## 📞 Support

- **Issues**: Open an issue in the repository if you find bugs
- **Discussions**: Use Discussions for questions and debates
- **Email**: [your-email@example.com]

---

**Made with ❤️ for the basketball community.**
