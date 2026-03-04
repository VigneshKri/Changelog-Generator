# Key Performance Indicators (KPIs)

> Metrics that demonstrate the value and impact of the Changelog Generator.

---

## Product Metrics

| KPI | Definition | Target | How We Measure |
|-----|-----------|--------|----------------|
| **Time Saved per Release** | Minutes saved vs. manual changelog writing | ~2 min/commit | `commits × 2 min` — displayed in Analytics tab |
| **Commit Quality Score** | Average quality across all processed commits | ≥ 75/100 | Weighted: format (30%), length (20%), clarity (25%), scope (15%), body (10%) |
| **Conventional Commit Adoption** | % of commits following conventional format | ≥ 80% | Parsed against `type(scope): description` pattern |
| **Release Health Score** | Composite health of each release | ≥ 60/100 | Feature ratio, bug ratio, breaking change penalty, performance bonus |

## Engineering Metrics

| KPI | Definition | Current | Notes |
|-----|-----------|---------|-------|
| **Build Time** | Production build duration | ~2s (Vite) | Down from ~30s with CRA |
| **Bundle Size** | Total JS output (gzipped) | ~2.1 MB gzip | Includes WebLLM for on-device AI |
| **Lighthouse Score** | Performance audit | Target ≥ 90 | Offline-capable via service worker |
| **Zero-Config Ratio** | Features requiring no setup | 100% | All features work with paste-and-go |

## User Value Metrics

| KPI | Definition | Measurement |
|-----|-----------|-------------|
| **Changelogs Generated** | Total history entries created | `localStorage changelog_history` count |
| **Export Diversity** | Formats used (MD/HTML/Slack/JSON/PDF) | Format tab selections |
| **Template Usage** | Distribution across Standard/Minimalist/Executive/Social | Template tab selections |
| **Audience Split** | End-User vs Stakeholder persona usage | Config audience toggle |

## Impact Dashboard (from Analytics Tab)

The built-in Analytics tab tracks these KPIs automatically:

- **Latest Health Score** — Most recent release health
- **Latest Quality Score** — Most recent commit quality average
- **Total Commits Processed** — Running total across all changelogs
- **Release Count** — Number of changelogs generated
- **Hours Saved** — Cumulative time saved (commits × 2 min)

### Trend Charts

- **Release Health Trend** — Line chart showing health score over time
- **Commit Quality Trend** — Line chart showing quality improvements
- **Commit Volume** — Bar chart showing commits per release

---

## How to Use These KPIs

### For Portfolio / Case Study
> "Processed 500+ commits across 12 releases, saving an estimated 16.7 hours of manual changelog writing while maintaining an average quality score of 82/100."

### For Stakeholder Communication
> "Release v2.1.0 includes 47 changes with a health score of 78/100. No breaking changes — safe to deploy."

### For Team Retrospectives
> "Conventional commit adoption improved from 45% to 89% over the last 5 releases, directly improving changelog quality from C to A grade."

---

_These KPIs are automatically tracked in the Analytics tab — no manual measurement required._
