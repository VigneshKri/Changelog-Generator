# Changelog Generator

> A privacy-first, AI-powered tool that transforms raw git commits into polished, stakeholder-ready release notes — entirely in the browser.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8)
![License](https://img.shields.io/badge/License-MIT-green)

---

## The Problem

Every engineering team ships code. Very few ship good release notes.

The gap between `fix: resolve null pointer in auth flow` and *"We fixed a bug that was preventing some users from logging in"* costs real time. Manual changelog writing averages **~2 minutes per commit** — multiplied across weekly releases, that's hours of engineering time burned on communication work that should be automated.

Existing tools (`semantic-release`, `github-changelog-generator`) solve the CI/CD side but produce developer-facing output. SaaS tools (Headway, Beamer) cost $49+/mo and require vendor lock-in. None offer AI humanization, offline support, or built-in quality analytics.

## The Solution

Changelog Generator is a **zero-config, client-side web app** that:

1. **Ingests** commits via paste or GitHub API (up to 500 commits with automatic pagination)
2. **Categorizes** them into 7 groups using conventional commit parsing + plain-text inference
3. **Humanizes** each entry through an 80+ pattern regex engine or any of 6 AI providers
4. **Exports** polished release notes in 5 formats (Markdown, HTML, Slack, JSON, PDF) across 4 templates
5. **Analyzes** release health, commit quality (A–F grading), and trends over time

All processing happens in the browser. No data leaves the client. No account required.

---

## Key Capabilities

### Commit Intelligence

| Capability | Detail |
|---|---|
| **Parsing** | Conventional commits (`feat:`, `fix:`, `perf:`) + plain-text auto-detection |
| **Categorization** | 7 categories: Features, Fixes, Performance, Breaking, Docs, Improvements, Maintenance |
| **Humanization** | 80+ domain-specific regex patterns (auth, API, UI/UX, security, i18n, etc.) |
| **Tone Control** | Professional, Casual, or Technical output modes |
| **Ticket Detection** | Auto-links Jira (`PROJ-123`), Linear, and GitHub (`#123`) references |

### AI Integration

Six provider options, all optional — the regex engine works standalone:

| Provider | Runtime | Setup |
|---|---|---|
| **Ollama** | Local machine | Auto-detected, zero config |
| **WebLLM** | In-browser (WebGPU) | No API key, no server |
| **Gemini** | Cloud (free tier) | [Google AI Studio](https://aistudio.google.com/apikey) key |
| **Groq** | Cloud | [Groq Console](https://console.groq.com) key |
| **OpenAI** | Cloud | [OpenAI Platform](https://platform.openai.com/api-keys) key |
| **Custom** | Any | OpenAI-compatible endpoint URL |

Automatic fallback: if any AI batch fails, it degrades gracefully to the regex engine per-batch — no full-pipeline failures.

### Export Pipeline

| Format | Use Case |
|---|---|
| **Markdown** | GitHub releases, documentation sites |
| **HTML** | Email newsletters, embedded widgets |
| **Slack** | Channel announcements (native formatting) |
| **JSON** | API consumption, CI/CD pipelines |
| **PDF** | Stakeholder reports, executive summaries |

Each format supports **4 templates** (Standard, Minimalist, Executive Summary, Social Media) and **2 audience modes** (End-User vs. Stakeholder — different category titles and framing).

### Version Diff

Compare any two saved changelogs side-by-side:

- **Automatic detection** of added, removed, and unchanged items between versions
- **Summary cards** with color-coded counts (+added / −removed / unchanged / new categories)
- **Per-category stat grid** showing item count changes with directional indicators
- **Item-level diff** with green (added), red (removed, struck-through), and muted (unchanged) styling
- Smart defaults — auto-selects the two most recent changelogs on open

### Loading Skeleton

Shimmer-based loading state that replaces the plain spinner during generation:

- Realistic placeholder layout mirroring the actual output (stat cards, category blocks, commit items)
- Smooth pulse animation with theme-aware shimmer gradients
- Frosted-glass overlay with contextual loading message and subtext

### Analytics Engine

Built-in release intelligence with no external dependencies:

- **Release Health Score** (0–100) — SVG ring visualization, release type classification, category distribution, commit composition breakdown
- **Commit Quality Grading** (A–F) — Scores on message length, conventional format, scope usage, imperative mood, vague word detection — with per-commit breakdowns and context tooltips
- **Trend Analytics** — Charts tracking health scores, quality averages, and commit volume across all saved changelogs
- **Hours Saved** — Real-time estimate of time saved vs. manual changelog writing

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Client-side only** | Privacy by default — no backend, no data transmission, no GDPR concerns |
| **Vite over CRA** | 10x faster HMR, native ESM, smaller production bundles |
| **localStorage persistence** | Zero-friction data layer — no database, no auth, up to 50 changelogs |
| **CSS custom properties** | Full dark/light theming without a CSS-in-JS runtime |
| **Service Worker (stale-while-revalidate)** | Offline-first PWA — works without internet, background-refreshes when online |
| **Regex engine as default** | Deterministic output, no API dependency — AI is an enhancement, not a requirement |
| **Per-batch AI fallback** | One failed AI call doesn't break the entire changelog — resilience at the batch level |

---

## Competitive Landscape

| Criteria | This Project | semantic-release | github-changelog-generator | Headway / Beamer |
|---|---|---|---|---|
| **Setup** | Zero | CI/CD config | Ruby gem + token | SaaS account |
| **AI Humanization** | 6 providers | None | None | Manual |
| **Offline** | Full PWA | No | No | No |
| **Privacy** | 100% client-side | CI runner | GitHub API | Vendor servers |
| **Cost** | Free | Free (OSS) | Free (OSS) | $49+/mo |
| **Output Templates** | 4 | 1 (MD) | 1 (MD) | Fixed widget |
| **Audience Modes** | 2 | 1 | 1 | 1 |
| **Quality Analytics** | Built-in | None | None | None |
| **Ticket Detection** | Jira, Linear, GitHub | Plugins | GitHub-only | Manual |
| **Export Formats** | 5 | 1 | 1 | 1 |

**Positioning:** The only changelog tool that combines AI humanization, multi-format export, audience targeting, and built-in analytics — at zero cost with full data privacy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI** | React 18 |
| **Build** | Vite 7.3 |
| **Data** | GitHub REST API, localStorage |
| **AI** | Ollama, @mlc-ai/web-llm (WebGPU), Gemini, Groq, OpenAI |
| **Export** | jsPDF, react-markdown |
| **Offline** | Service Worker, PWA manifest |
| **Styling** | CSS3 custom properties (no runtime) |

---

## Project Structure

```
/
├── index.html                  # Vite entry point
├── vite.config.js              # Build config (port 3000, build/ output)
├── ROADMAP.md                  # Product roadmap
├── KPIs.md                     # Success metrics
│
├── public/
│   ├── manifest.json           # PWA manifest
│   └── service-worker.js       # Offline caching strategy
│
└── src/
    ├── main.jsx                # Bootstrap + SW registration
    ├── App.jsx                 # Root: routing, theme, analytics
    ├── index.css               # Global styles + theme tokens
    │
    ├── components/
    │   ├── Header.jsx          # Tab navigation + theme toggle
    │   ├── CommitInput.jsx     # Paste / GitHub fetch input
    │   ├── ConfigPanel.jsx     # Version, tone, audience config
    │   ├── AIConfigPanel.jsx   # AI provider selection + model config
    │   ├── ChangelogOutput.jsx # Rendered output (drag/drop, inline edit)
    │   ├── ExportPanel.jsx     # Format tabs, template tabs, copy/download/PDF
    │   ├── ChangelogHistory.jsx# History, backup/restore, draft/final
    │   ├── ReleaseHealthDashboard.jsx
    │   ├── CommitQualityPanel.jsx
    │   ├── ChangelogDiff.jsx   # Version diff (compare two changelogs)
    │   ├── LoadingSkeleton.jsx  # Shimmer skeleton loading state
    │   ├── ComparisonView.jsx   # Before/after diff
    │   ├── Hero.jsx             # Landing section
    │   └── Footer.jsx
    │
    └── utils/
        ├── changelogEngine.js  # Parser, categorizer, humanizer, ticket linker
        ├── githubApi.js        # GitHub REST with pagination + error handling
        ├── aiService.js        # Multi-provider AI abstraction
        ├── webLLMService.js    # In-browser WebGPU inference
        ├── commitScorer.js     # Quality scoring algorithm
        └── pdfExport.js        # PDF generation via jsPDF
```

---

## Quickstart

```bash
git clone <repo-url> && cd project
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000). No environment variables required.

| Command | Description |
|---|---|
| `npm start` | Development server (Vite) |
| `npm run build` | Production build to `build/` |
| `npm run preview` | Preview production build locally |

---

## Resilience & Edge Cases

The app is designed to handle real-world conditions without breaking:

- **Network** — 15s timeout on GitHub, 45s on AI calls; clear error messages for offline, DNS, and timeout failures
- **GitHub pagination** — Automatic multi-page fetching beyond the 100-per-page API cap
- **AI degradation** — Per-batch fallback to regex; Ollama 404s suggest `ollama pull <model>`
- **Input sanitization** — 500-char truncation per commit before AI; 500-commit fetch cap; warning banner at 1,000+ pasted lines
- **Parse safety** — Non-JSON responses (CDN error pages) caught gracefully; non-conventional commits categorized as maintenance
- **Mobile** — Full iOS PWA meta tags; responsive analytics; touch-friendly controls

---

## Target Users

| Persona | Value Proposition |
|---|---|
| **Engineers** | Eliminate manual changelog writing — save ~2 min per commit |
| **Product Managers** | Stakeholder-ready release notes with audience targeting |
| **Founders / Indie Devs** | Professional update communication with zero cost or setup |
| **DevRel** | Multi-format export for blogs, Slack, docs, and social |

---

## Documentation

| Document | Contents |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Product roadmap — completed phases and planned work |
| [KPIs.md](./KPIs.md) | Success metrics and measurement methodology |

---

## License

MIT
