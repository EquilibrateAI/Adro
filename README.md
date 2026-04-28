# Adro

<!-- badges start -->

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009989?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![GitHub Stars](https://img.shields.io/github/stars/EquilibrateAI/Adro?style=flat&logo=github)](https://github.com/EquilibrateAI/Adro/stargazers)

<!-- badges end -->

---

## About Adro

Adro is an AI-powered data analytics tool that runs entirely offline on your local machine. It transforms raw data into intelligent, interactive dashboards and actionable insights without requiring any cloud services or internet connection.

Simply upload your dataset in CSV format, and Adro provides:

- Data viewing and exploration
- Interactive charts and visualizations
- Anomaly detection and data cleaning
- AI-powered dashboard generation via natural language
- Prediction modeling
- Optimization workflows

All data stays on your machine. No accounts, no credits, no internet required.

---

## Features

### Data Management

- Upload CSV datasets
- View data as interactive tables
- Build charts manually (8 chart types)
- Detect and clean anomalies
- Column statistics and metadata

### AI Dashboard

The most powerful feature. Ask questions in natural language about your dataset, and Adro generates:

- Interactive dashboards
- Visualizations
- Text responses with insights

Supports multiple LLM providers:

- OpenAI
- Anthropic Claude
- Google Gemini
- Local LLMs (Ollama, Llama.cpp)

### Modeling

- **Predict**: Select a target variable, input predictor values, and get predictions
- **Optimize**: Define a target value or range, and Adro calculates the optimized predictor values

---

## Table of Contents

- [About Adro](#about-adro)
- [Features](#features)
  - [Data Management](#data-management)
  - [AI Dashboard](#ai-dashboard)
  - [Modeling](#modeling)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Tech Stack

### Frontend

| Category         | Technology                                    | Version          |
| ---------------- | --------------------------------------------- | ---------------- |
| Framework        | [Next.js](https://nextjs.org/)                | 14+ (App Router) |
| UI Library       | [React](https://react.dev/)                   | 18+              |
| Language         | [TypeScript](https://www.typescriptlang.org/) | 5+               |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/)      | 4+               |
| Styling          | [Tailwind CSS](https://tailwindcss.com/)      | 3+               |
| UI Components    | [Radix UI](https://www.radix-ui.com/)         | 1.0+             |
| Charts           | [ECharts](https://echarts.apache.org/)        | 5+               |
| HTTP Client      | Fetch API                                     | -                |

### Backend

| Category         | Technology                                    | Version          |
| ---------------- | --------------------------------------------- | ---------------- |
| Framework        | [FastAPI](https://fastapi.tiangolo.com/)      | 0.109+          |
| Language        | [Python](https://www.python.org/)           | 3.11+            |
| Database        | [DuckDB](https://duckdb.org/)             | -                |
| Data Processing | [Polars](https://www.pola.rs/)            | -                |
| ML Library      | [XGBoost](https://xgboost.readthedocs.io/) | -                |
| Optimization   | [Optuna](https://optuna.org/)            | -                |
| LLM Integration | [Anthropic](https://www.anthropic.com/)    | -                |
|                 | [OpenAI](https://platform.openai.com/)    | -                |
|                 | [Google AI](https://ai.google.dev/)     | -                |

---

## Prerequisites

- **Python** 3.11 or higher
- **Node.js** v18 or higher
- **npm** v9 or higher (or yarn/pnpm)

### Recommended Tools

- [VS Code](https://code.visualstudio.com/) - Recommended code editor
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/EquilibrateAI/Adro.git
cd Adro

# Set up the frontend
cd frontend
npm install
cp .env.example .env

# In another terminal, set up the backend
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run backend
cd app
uvicorn main:app --reload --port 8000

# Run frontend (from frontend directory)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/adro.git
cd adro/my-adro
```

You can also use SSH:

```bash
git clone git@github.com:yourusername/adro.git
cd adro/my-adro
```

### 2. Install Dependencies

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

Or if using pnpm:

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file and fill in your configuration:

```bash
cp .env.example .env
```

```env
# Backend API URL (required)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application name (optional)
NEXT_PUBLIC_APP_NAME=Adro

# API Keys (optional - add as needed)
ANTHROPIC_API_KEY=your_api_key_here
OPENAI_API_KEY=your_openai_key_here

# Feature flags (optional)
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_TELEMETRY=true
```

> [!TIP]
> Always use the `.env.example` as a template for your local `.env` file. It contains all the necessary keys required to run the application and is kept up-to-date as new features are added.

---

## Configuration

### Environment Variables

| Variable                       | Required | Default | Description                       |
| ------------------------------ | -------- | ------- | --------------------------------- |
| `NEXT_PUBLIC_API_URL`          | Yes      | -       | Backend API base URL              |
| `NEXT_PUBLIC_APP_NAME`         | No       | "Adro"  | Application name                  |
| `ANTHROPIC_API_KEY`            | No       | -       | Anthropic API key for AI features |
| `OPENAI_API_KEY`               | No       | -       | OpenAI API key                    |
| `NEXT_PUBLIC_ENABLE_DEBUG`     | No       | false   | Enable debug mode                 |
| `NEXT_PUBLIC_ENABLE_TELEMETRY` | No       | true    | Enable anonymous telemetry        |

### Next.js Configuration

The `next.config.ts` file contains Next.js configuration options. Key settings:

- **Image Optimization**: Configured for external domains
- **API Routes**: All backend communication goes through typed service functions
- **TypeScript**: Strict mode enabled
- **React Compiler**: Experimental features enabled

```typescript
// next.config.ts example
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  // Enable experimental features
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
};

export default nextConfig;
```

---

## Project Structure

```
adro/                      # Monorepo root
├── frontend/              # Next.js/React application
│   ├── app/               # Next.js App Router pages
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── dashboard2/
│   │   │   └── page.tsx
│   │   ├── data/
│   │   │   └── page.tsx
│   │   ├── modeling/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── components/        # React components
│   │   ├── dashboard/    # Dashboard components
│   │   │   ├── chart/
│   │   │   ├── dashboard/
│   │   │   ├── sidebar/
│   │   │   └── text-mode/
│   │   ├── data/         # Data components
│   │   │   ├── data-explore/
│   │   │   ├── files/
│   │   │   └── sidebar/
│   │   ├── modeling/     # Modeling components
│   │   │   ├── optimise/
│   │   │   ├── predict/
│   │   │   └── sidebars/
│   │   ├── ui/          # Shared UI components
│   │   │   ├── loaders/
│   │   │   └── ...
│   │   ├── nav-*.tsx
│   │   ├── settings/
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── services/        # API services
│   │   ├── api/        # API endpoint functions
│   │   └── utils/      # Zustand stores
│   ├── public/         # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
├── backend/             # Python/FastAPI application
│   ├── app/
│   │   ├── api/       # API route handlers
│   │   │   ├── column_information.py
│   │   │   ├── data_source.py
│   │   │   ├── dashboard/
│   │   │   │   ├── chat_history/
│   │   │   │   └── llm_engine/
│   │   │   ├── data/
│   │   │   │   ├── chart_data_generation.py
│   │   │   │   ├── data_cleaning.py
│   │   │   │   ├── data_table.py
│   │   │   │   ├── file_uploader.py
│   │   │   │   └── database/
│   │   │   │       ├── connection.py
│   │   │   │       ├── postgres_helper.py
│   │   │   │       └── postgres_table.py
│   │   │   ├── modeling/
│   │   │   │   ├── optimization/
│   │   │   │   └── prediction/
│   │   │   └── settings/
│   │   ├── utils/    # Business logic
│   │   │   ├── dashboard/
│   │   │   │   ├── chat_history/
│   │   │   │   └── llm_engine/
│   │   │   ├── optimization/
│   │   │   ├── prediction/
│   │   │   │   └── ml_models/
│   │   │   │       └── xg_boost/
│   │   │   ├── process_data/
│   │   │   │   ├── data_cleaning/
│   │   │   │   ├── data_ingestion/
│   │   │   │   └── meta_anamoly/
│   │   │   └── settings/
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── README.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Development

### Running the Development Server

```bash
npm run dev
````

The app will be available at [http://localhost:3000](http://localhost:3000).

Hot reload is enabled, so changes will be reflected automatically.

This will:

1. Start the Next.js dev server

The desktop app will be available with native window controls.

**Note**: Make sure you have Rust installed:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Update Rust
rustup update
```

### Building for Production

#### Web Build (Next.js)

```bash
npm run build
```

This creates an optimized production build in the `.next` folder.

Then start the production server:

```bash
npm start
```

Or run with a custom port:

```bash
npm start -- -p 8080
```

This creates:

- Windows: `.exe` installer and portable version
- macOS: `.dmg` installer
- Linux: `.AppImage` and `.deb` packages

### Code Quality

```bash
# Run linting with auto-fix
npm run lint

# Type checking
npm run typecheck

# Format code with Prettier
npm run format

# Check for unused exports
npm run postinstall
```

### Automation & Git Hooks

To maintain a "Gold Standard" codebase, we use **Husky** and **lint-staged**.

- **Automatic Formatting**: Every time you run `git commit`, Husky triggers a pre-commit hook that runs **Prettier** and **ESLint**.
- **Lint-Staged**: Only the files you have changed will be checked, ensuring fast commits while guaranteeing that no "dirty" code ever reaches the repository.
- **Prettier**: Our formatting rules are defined in `.prettierrc`. You don't need to worry about spacing or semicolons; the hooks will fix them for you!

---

## Architecture

### High-Level Architecture

Adro follows a clean, modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                       │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  /data  │  │ /dashboard  │  │ /modeling   │              │
│  └────┬────┘  └──────┬──────┘  └──────┬──────┘              │
└───────┼──────────────┼───────────────┼──────────────────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                State Layer (Zustand Stores)                │
│  useChatStore │ useChartStore │ usePredictionStore ...      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Service Layer (API Helpers)                   │
│  fetchDataSources │ plotChartData │ manualPredictor ...     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               API Layer (Backend - External)                 │
│      /data/* │ /llm/* │ /predictor/* │ /optimizer/*          │
└─────────────────────────────────────────────────────────────┘
```

### State Management

We use [Zustand](https://zustand-demo.pmnd.rs/) for feature-level state management. Stores are located in `services/utils/stores/`.

| Store                        | Purpose                        | Key Methods                           |
| ---------------------------- | ------------------------------ | ------------------------------------- |
| `useChatStore`               | AI Assistant chat messages     | `addMessage`, `clearChat`             |
| `useGeneratedChartDataStore` | Chart configuration and data   | `setChart`, `getChart`, `clearCharts` |
| `useChartAnalyticsStore`     | Chart analytics, insights      | `setAnalytics`, `getAnalytics`        |
| `useDashboardStore`          | Dashboard KPIs, charts, tables | `setDashboard`, `getDashboard`        |
| `usePredictionStore`         | Prediction metrics and results | `setPredictions`, `getPredictions`    |
| `useOptimizationStore`       | Optimization results           | `setOptimization`, `getOptimization`  |

#### Example: Using a Store

```typescript
import { useChatStore } from "@/services/utils/stores/chat-store";

// In a component
const { messages, addMessage, clearChat } = useChatStore();

// Add a message
addMessage({
  role: "user",
  content: "Show me a chart of sales data",
});

// Access messages
console.log(messages);
```

### API Integration

All backend communication happens through typed service functions in `services/utils/`:

```typescript
// Example: Fetching data sources
import { fetchDataSources } from "@/services/utils/data/fetch-data-sources";

// In a component
const dataSources = await fetchDataSources();

// Example: Running a prediction
import { manualPredictor } from "@/services/utils/modeling/manual-predictor";

const result = await manualPredictor({
  file: "sales_data.csv",
  target: "revenue",
  predictors: ["marketing_spend", "population", "region"],
});
```

---

## Feature Areas

### /data – Data Management

The `/data` section provides comprehensive data management capabilities for connecting to databases, uploading files, viewing tables, cleaning data, and creating charts.

#### 1. Sidebar (Connections & Files)

- **Key Component**: `components/data/sidebar/data-sidebar.tsx`
- **Responsibilities**:
  - Display saved database connections by calling `fetchConnectionDetails` → `/data/connections`
  - On connection selection: call `fetchPostgresTableInfo` → `/data/postgres/table-info`
  - File upload integration: `components/data/files/upload/*` → `/data/file_upload`

#### 2. File Upload & Database Connection

**File Upload Flow**:

1. User selects CSV or DuckDB file
2. Upload helper calls `/data/file_upload`
3. On success, sidebar refreshes data sources

**Database Connection Flow**:

1. User enters credentials in sidebar form
2. `testConnection` → `/data/test-connection`
3. If valid: `saveConnectionDetails` → `/data/import-postgres`
4. Imported tables appear alongside uploaded files

#### 3. Data Table

After selecting a table/file:

1. **Basic Table Info** - `/data/table-operations` with `action: "table-info"`
2. **Column Metadata** - `getColumnInfo` → `/columns/column-info`
3. **Initial Data** - `/data/table-operations` with `action: "table-data"`
4. **Interactions** - Search, sort, filter via `/data/table-operations`

Supporting components:

- `data-table.tsx` - Core table UI
- `data-table-filter.tsx` - Simple filters
- `data-filter.tsx` - Advanced filter builder

#### 4. Data Cleaning

- **Button**: "Clean Data" in data table section
- **Handler**: `handleCleanData` → `/data/clean-data`
- **Request**: Data source name + cleaning steps (remove nulls, handle outliers)
- **Response**: Refreshed table data

#### 5. Data Chart

**Flow**:

1. **Column Discovery**: `fetchColumnData` → `/columns/data-charts-column-info`
2. **Chart Configuration**: User selects chart type, axes, groupings, filters
3. **Generate**: `handleGenerateChart` → `/data/chart-data-fetch`
4. **Render**: Chart component displays ECharts visualization

---

### /dashboard – AI Assistant

The `/dashboard` route hosts the AI assistant interface with three interaction modes.

#### 1. AI Assistant Interface

**Main Component**: `components/dashboard/*` (typically `interface.tsx`)

**Responsibilities**:

- Manage chat input, mode selector, message list
- Map user messages to correct backend endpoints
- Update feature-specific Zustand stores

#### Text Mode

- **Endpoint**: `/llm/chat`
- **Request**: User message
- **Response**: Natural language content + optional KPIs and tables
- **Storage**: `useChatStore`

#### Chart Mode

- **Endpoint**: `/llm/chart_mode`
- **Response** split into:
  - **Chart Config/Data** → `useGeneratedChartDataStore` (by `chartId`)
  - **Analytics** → `useChartAnalyticsStore` (by `chartId`)
- **Display**: `Chart` component → `UnifiedChartCard`

#### Dashboard Mode

- **Endpoint**: `/llm/dashboard`
- **Response**: Summary, KPIs, chart definitions, tables
- **Storage**: `useDashboardStore`
- **Display**: Full dashboard with KPI, Chart, Table sections

#### 2. Column Info Sidebar

- On mount: `fetchDataSources` → `/data_sources_info/datasources-metadata`
- Default: First data source selected
- On change: `getColumnInfo` → `/columns/column-info`
- Display: Column names, types, missing values, statistics

---

### /modeling – Predict & Optimize

Two ML-style workflows in `/modeling`:

#### Predict

**Core Components**:

- `predict.tsx` - Main container
- `predict-sec-one.tsx` - Summary cards (Prediction, R², RMSE)
- `predict-sec-two.tsx` - Line chart (actual vs predicted)
- `predict-sec-three.tsx` - Detailed metrics
- `sidebar-left-predict.tsx` - Configuration sidebar

**Flow**:

1. Load data sources: `fetchDataSources` → `/data_sources_info/datasources-metadata`
2. Load columns: `getColumnInfo` → `/columns/column-info`
3. User selects target + predictors
4. Run: `manualPredictor` → `/predictor/predict`
5. Store: `usePredictionStore`

#### Optimize

**Core Components**:

- `optimise.tsx` - Main container
- `optimise-sec-one.tsx` - Summary cards
- `optimise-sec-two.tsx` - Bar chart + recommendations
- `optimise-sec-three.tsx` - Top solutions table
- `sidebar-left-optimise.tsx` - Configuration sidebar

**Flow**:

1. Load data sources & columns (same as predict)
2. User defines target value/range + predictor constraints
3. Run: `manualOptimiser` → `/optimizer/optimize_predictor`
4. Store: `useOptimizationStore`

---

## Deployment

Adro requires both the frontend and backend to be running. The application consists of:

- **Frontend**: Next.js app running on port 3000
- **Backend**: FastAPI server running on port 8000

Both services must be running for the application to function properly.

### Development Deployment

```bash
# Terminal 1 - Start the backend
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
cd app
uvicorn main:app --reload --port 8000

# Terminal 2 - Start the frontend
cd frontend
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000) and will communicate with the backend at [http://localhost:8000](http://localhost:8000).

### Production Deployment

#### Option 1: Local Production

```bash
# Backend
cd backend
source venv/bin/activate
cd app
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
npm start
```

#### Option 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
docker-compose up --build
```

#### Option 3: Vercel (Frontend Only)

For deploying only the frontend to Vercel (requires a separate backend URL):

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure `NEXT_PUBLIC_API_URL` environment variable to point to your backend
4. Deploy

```bash
# Using Vercel CLI
npm i -g vercel
vercel
```

### Environment Variables

Both frontend and backend require specific environment variables to run properly.

#### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (.env)

```bash
# LLM Provider API Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=...

# Database (optional)
DATABASE_URL=postgresql://...
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Getting Started

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch

### Development Workflow

1. **Clone** your fork and install dependencies: `npm install`. This will automatically set up your local Git hooks.
2. **Setup Env**: Run `cp .env.example .env` and configure your local backend URLs.
3. **Branching**: Create a feature branch: `git checkout -b feature/amazing-feature`.
4. **Committing**: When you run `git commit`, our automated hooks will format your code. If there are linting errors that can't be fixed automatically, the commit will be blocked until you fix them.
5. **Submit**: Use the provided **Pull Request Template** when opening a PR. It contains a checklist to ensure your contribution meets our quality standards.

### Issue & PR Templates

We use standardized templates for **Bug Reports**, **Feature Requests**, and **Pull Requests**. Please fill them out completely to help us review and merge your changes faster.

### Code Style

- **TypeScript**: Strict mode, use interfaces over types
- **React**: Functional components, hooks over class components
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Use path aliases (`@/components/...`)
- **Formatting**: Prettier handles formatting automatically

### Pull Request Guidelines

1. Fill out the PR template completely
2. Include screenshots for UI changes
3. Update documentation if needed
4. Ensure all tests pass
5. Request review from maintainers

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

By participating, you are expected to uphold this code. Please report unacceptable behavior to contact@adro.ai.

---

## Security

Found a security vulnerability? Please read our [Security Policy](SECURITY.md) for reporting instructions.

**Do NOT** report security vulnerabilities in public issues. Email security@adro.ai instead.

---

## Community

- **GitHub Discussions** - Q&A and ideas
- **Discord** - Chat with the community
- **Twitter** - Follow updates

Join our community:

- [Discord](https://discord.gg/adro)
- [Twitter](https://twitter.com/adroai)

---

## License

Distributed under the **Apache License 2.0**. See [LICENSE](LICENSE) for more information.

Copyright (c) 2024 Pavan

---

## Support

- **Documentation**: This README and inline code comments
- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/adro/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/yourusername/adro/discussions)

---

## Acknowledgments

- [Next.js](https://nextjs.org/) - For the amazing React framework
- [Zustand](https://zustand-demo.pmnd.rs/) - For simple state management
- [Radix UI](https://www.radix-ui.com/) - For accessible primitives
- [ECharts](https://echarts.apache.org/) - For beautiful charts
- [Tailwind CSS](https://tailwindcss.com/) - For utility-first CSS
- [All Contributors](https://github.com/yourusername/adro/graphs/contributors)

---

## FAQ

### Q: What backend does Adro use?

A: Adro Frontend expects a backend exposing certain HTTP endpoints. The backend is treated as a black-box API - see the Architecture section for required endpoints.

### Q: Can I run Adro without a backend?

A: Currently, no. The frontend requires a running backend for data operations, AI features, and ML workflows.

### Q: How do I add a new data source?

A: Implement the backend endpoint for your data source type, then add the connection form in the sidebar component.

### Q: Is Adro free to use?

A: Yes, Adro is open source under the Apache 2.0 license. You can use, modify, and distribute it freely.

### Q: How do I contribute?

A: See the Contributing section. We'd love your contributions!

### Q: What browsers are supported?

A: Adro supports all modern browsers (Chrome, Firefox, Safari, Edge). Internet Explorer is not supported.

---

# Adro Backend

# <<<<<<< HEAD

# Adro Backend

> > > > > > > f97b097c0265a2322e4c24b7b5e3c47fb94ca1ef

<!-- badges start -->

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Code Style](https://img.shields.io/badge/code%20style-black-000000?style=flat)](https://github.com/psf/black)

<!-- badges end -->

> Python/FastAPI backend service powering the Adro data analytics platform

Adro Backend is a FastAPI application that provides the API layer for data ingestion, cleaning, AI-assisted dashboard generation, prediction, and optimization workflows. It is designed to be run alongside the [Adro Frontend](https://github.com/yourusername/adro).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Clone the Repository](#1-clone-the-repository)
  - [Create a Virtual Environment](#2-create-a-virtual-environment)
  - [Install Dependencies](#3-install-dependencies)
  - [Environment Setup](#4-environment-setup)
- [Running the Server](#running-the-server)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Development](#development)
  - [Code Style](#code-style)
  - [Linting and Formatting](#linting-and-formatting)
  - [Branch Naming](#branch-naming)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **File Ingestion** — Upload CSV files; automatically converted to DuckDB for fast querying
- **Data Cleaning** — Null handling, type casting, rounding, column sanitization
- **Metadata & Anomaly Detection** — Auto-generated column statistics and data quality reports
- **AI Dashboard Generation** — Multi-agent LLM workflow producing KPIs, ECharts definitions, and tables
- **Prediction** — XGBoost model training and inference with R² / RMSE metrics
- **Optimization** — Optuna-based input optimization to hit user-defined target values or ranges
- **Column & Data Source APIs** — Metadata endpoints consumed by the frontend sidebar and chart builder

---

## Tech Stack

| Category        | Technology                                               | Version |
| --------------- | -------------------------------------------------------- | ------- |
| Framework       | [FastAPI](https://fastapi.tiangolo.com/)                 | 0.100+  |
| Language        | [Python](https://www.python.org/)                        | 3.10+   |
| Data Processing | [Polars](https://pola.rs/)                               | latest  |
| Database        | [DuckDB](https://duckdb.org/)                            | latest  |
| ML              | [XGBoost](https://xgboost.readthedocs.io/)               | latest  |
| Optimization    | [Optuna](https://optuna.org/)                            | latest  |
| AI Agents       | [Agno](https://github.com/agno-agi/agno)                 | latest  |
| Settings        | [python-dotenv](https://pypi.org/project/python-dotenv/) | latest  |
| Formatter       | [Black](https://black.readthedocs.io/)                   | latest  |

---

## Prerequisites

- **Python** 3.10 or higher
- **pip** 23 or higher

### Recommended Tools

- [VS Code](https://code.visualstudio.com/) with the [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
- [Black](https://black.readthedocs.io/) — auto-formatter (configured in `pyproject.toml`)

---

## Quick Start

```bash
git clone https://github.com/yourusername/adro-backend.git
cd adro-backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # fill in your values

uvicorn app.main:app --reload
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/adro-backend.git
cd adro-backend
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

> [!TIP]
> Always use `.env.example` as the template. It is kept up to date as new settings are added.

---

## Running the Server

```bash
# Development (hot reload)
uvicorn app.main:app --reload

# Custom host/port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --workers 4
```

Interactive API docs are available at `http://localhost:8000/docs` once the server is running.

---

## Project Structure

```
backend/
├── app/
│   ├── api/                # API route handlers
│   │   ├── column_information.py
│   │   ├── data_source.py
│   │   ├── dashboard/
│   │   │   ├── chat_history/
│   │   │   │   └── chathistory.py
│   │   │   └── llm_engine/
│   │   │       └── dashboardgeneration.py
│   │   ├── data/
│   │   │   ├── chart_data_generation.py
│   │   │   ├── data_cleaning.py
│   │   │   ├── data_table.py
│   │   │   ├── file_uploader.py
│   │   │   └── database/
│   │   │       ├── connection.py
│   │   │       ├── postgres_helper.py
│   │   │       └── postgres_table.py
│   │   ├── modeling/
│   │   │   ├── optimization/
│   │   │   │   └── optimizer.py
│   │   │   └── prediction/
│   │   │       └── ml_model_predictor.py
│   │   └── settings/
│   │       ├── api_ping.py
│   │       └── fetch_settings.py
│   ├── utils/              # Business logic
│   │   ├── dashboard/
│   │   │   ├── chat_history/
│   │   │   │   └── chat_functions.py
│   │   │   └── llm_engine/
│   │   │       ├── json_utils.py
│   │   │       ├── kill_agent.py
│   │   │       ├── llm_agent_single.py
│   │   │       ├── llm_agent_team.py
│   │   │       └── tools_generation.py
│   │   ├── model_assistants/
│   │   │   └── model_helpers.py
│   │   ├── optimization/
│   │   │   ├── optimizer_assistant.py
│   │   │   └── optuna_optimizer.py
│   │   ├── prediction/
│   │   │   └── ml_models/
│   │   │       └── xg_boost/
│   │   │           ├── correlation.py
│   │   │           ├── prediction_assistant.py
│   │   │           ├── xg_boost_full.py
│   │   │           └── xgboost_predictor.py
│   │   ├── process_data/
│   │   │   ├── data_cleaning/
│   │   │   │   ├── clean.py
│   │   │   │   └── cleanup_config.json
│   │   │   ├── data_ingestion/
│   │   │   │   └── create_files.py
│   │   │   └── meta_anamoly/
│   │   │       ├── anomaly.py
│   │   │       └── metadata.py
│   │   └── settings/
│   │       └── models.py
│   ├── config.py            # CORS, app settings
│   └── main.py              # FastAPI app init, router includes
├── requirements.txt
└── README.md
```

---

## API Overview

| Prefix               | File                       | Key Endpoints                                        |
| -------------------- | -------------------------- | ---------------------------------------------------- |
| `/columns`           | `column_information.py`    | `POST /column-info`, `POST /data-charts-column-info` |
| `/data_sources_info` | `data_source.py`           | `GET /datasources-metadata`                          |
| `/data`              | `data_table.py`            | `POST /table-operations`                             |
| `/data`              | `file_uploader.py`         | `POST /file_upload`, `DELETE /file-delete`           |
| `/data`              | `data_cleaning.py`         | `POST /clean-data`                                   |
| `/data`              | `chart_data_generation.py` | `POST /chart-data-fetch`                             |
| `/predictor`         | `ml_predictor.py`          | `POST /predict`                                      |
| `/optimizer`         | `optimize_predictor.py`    | `POST /optimize_predictor`                           |
| `/optimizer`         | `optimizer_llm.py`         | `POST /optimizer-assistant`                          |
| `/llm`               | `dashboard_generation.py`  | `POST /dashboard-generation`                         |

Full interactive documentation is available at `/docs` when the server is running.

---

## Development

### Code Style

This project follows [PEP 8](https://peps.python.org/pep-0008/) with [Black](https://black.readthedocs.io/) as the auto-formatter. Black's default line length of **88 characters** is used throughout.

Key conventions:

- **Formatter**: Black (line length 88) — run before every commit
- **Indentation**: 4 spaces per level, no tabs
- **Imports**: Ordered stdlib → third-party → local, each group separated by a blank line
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_CASE` for module-level constants
- **Type hints**: Required on all function signatures ([PEP 484](https://peps.python.org/pep-0484/))
- **Docstrings**: Required on all public functions, classes, and modules ([PEP 257](https://peps.python.org/pep-0257/)) — include `Args:` and `Returns:` sections
- **Logging**: Use `logging.getLogger(__name__)` — no bare `print()` calls in production code
- **Router tags**: Every `APIRouter` must include a `tags=` argument

### Linting and Formatting

```bash
# Format with Black
pip install black
black .

# Lint with flake8 (style + common errors)
pip install flake8
flake8 .

# Type checking with mypy
pip install mypy
mypy app/
```

Black and flake8 configuration lives in `pyproject.toml`:

```toml
[tool.black]
line-length = 88

[tool.flake8]
max-line-length = 88
extend-ignore = E203
```

### Branch Naming

All branches must follow this pattern:

```
[type/ticket-id]-short-description

# Examples
feature/DEV-123-user-login
fix/DEV-456-null-pointer
refactor/DEV-789-clean-pipeline
docs/DEV-101-update-readme
```

| Prefix      | Purpose                                      |
| ----------- | -------------------------------------------- |
| `feature/`  | New features or enhancements                 |
| `fix/`      | Bug fixes                                    |
| `refactor/` | Code improvements without functional changes |
| `docs/`     | Documentation updates                        |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/DEV-123-your-feature`
3. Make your changes and ensure they pass linting: `black . && flake8 .`
4. Commit your changes: `git commit -m "feat: add your feature"`
5. Push to your branch: `git push origin feature/DEV-123-your-feature`
6. Open a pull request

Please ensure all code follows the style guidelines in the [Code Style](#code-style) section before submitting a pull request. PRs that fail linting or are missing type hints and docstrings will be asked to revise.

---

## License

Distributed under the **Apache License 2.0**. See [LICENSE](LICENSE) for more information.

Copyright (c) 2024 Pavan
