# Roadmap

> A living document tracking the evolution of the Changelog Generator — from MVP to product-grade tool.

---

## Completed

### Phase 1: Technical Foundation
- [x] **Vite Migration** — Migrated from Create React App to Vite for faster builds (2s vs 30s) and modern ESM-first tooling
- [x] **Data Portability** — JSON backup/restore for changelog history, with merge logic to avoid duplicates
- [x] **Draft/Final State** — Each changelog entry can be marked as Draft or Final, persisted in localStorage

### Phase 2: User Experience
- [x] **Audience Persona Toggle** — Switch between End-User and Stakeholder output (different category titles and framing)
- [x] **Batch History Selection** — Select multiple history entries and generate a combined release summary
- [x] **Context Tooltips** — Hover-over explanations on quality grades and scoring distribution
- [x] **Mobile Responsive Analytics** — Analytics cards, charts, and tables adapt to mobile viewports

### Phase 3: Product Logic & Analytics
- [x] **Jira/Linear Ticket Detection** — Auto-detects `PROJ-123` and `#123` ticket references, bolds them in output
- [x] **Hours Saved Counter** — Analytics card showing estimated time saved (~2 min per commit vs manual writing)
- [x] **Template Selection** — Choose between Standard, Minimalist, Executive, and Social Media output templates

---

## Planned

### Phase 5: Collaboration & Team Features
- [ ] **Shareable Links** — Generate a unique URL for a changelog that can be shared with teammates
- [ ] **Team Annotations** — Allow inline comments/annotations on specific changelog entries
- [ ] **Role-Based Views** — Different default views for PMs, engineers, and designers

### Phase 6: Integrations
- [ ] **GitHub Actions** — CI/CD integration to auto-generate changelogs on release tags
- [ ] **Slack Bot** — Post changelogs directly to a Slack channel on generation
- [ ] **Notion / Confluence Export** — One-click export to team documentation platforms

### Phase 7: Intelligence
- [ ] **Trend Alerts** — Notify when quality drops below threshold across releases
- [ ] **Auto-Categorization Improvements** — ML-based category detection beyond keyword matching
- [ ] **Commit Rewrite Suggestions** — AI-powered suggestions to improve commit messages before they happen

### Phase 8: Enterprise
- [ ] **Multi-Repo Dashboard** — Aggregate changelogs across multiple repositories
- [ ] **Access Control** — Team-level permissions for editing and publishing changelogs
- [ ] **Audit Log** — Track who generated, edited, and published each changelog

---

## Design Principles

1. **Offline-First** — All core features work without a network connection
2. **Zero Config** — Paste commits and get results; no setup required
3. **Progressive Complexity** — Simple by default, powerful when needed
4. **Data Ownership** — Users own their data; export/import everything as JSON

---

_Last updated: June 2025_
