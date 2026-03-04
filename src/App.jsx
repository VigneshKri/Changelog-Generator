import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import CommitInput from './components/CommitInput';
import ConfigPanel from './components/ConfigPanel';
import AIConfigPanel from './components/AIConfigPanel';
import ComparisonView from './components/ComparisonView';
import ChangelogOutput from './components/ChangelogOutput';
import ExportPanel from './components/ExportPanel';
import ChangelogHistory from './components/ChangelogHistory';
import { addToHistory } from './components/ChangelogHistory';
import ReleaseHealthDashboard from './components/ReleaseHealthDashboard';
import CommitQualityPanel from './components/CommitQualityPanel';
import Footer from './components/Footer';
import ChangelogDiff from './components/ChangelogDiff';
import LoadingSkeleton from './components/LoadingSkeleton';
import { parseCommitMessages, groupByCategory, generateMarkdown } from './utils/changelogEngine';
import { processCommitsWithAI, loadAIConfig, PROVIDERS } from './utils/aiService';
import { scoreAllCommits } from './utils/commitScorer';

/** Shared date formatter for history entries */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function App() {
  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('changelog_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('changelog_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  // State
  const [commits, setCommits] = useState([]);
  const [grouped, setGrouped] = useState(null);
  const [categoryOrder, setCategoryOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState(null);
  const [repoInfo, setRepoInfo] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const rawCommitTextRef = useRef('');
  const [aiConfig, setAiConfig] = useState(loadAIConfig());
  const [activeTab, setActiveTab] = useState('generator');
  const [config, setConfig] = useState({
    version: '',
    date: new Date().toISOString().split('T')[0],
    tone: 'professional',
    audience: 'end-user',
    showOriginal: false,
  });

  // Process commits with current tone (regex-based)
  const processCommits = useCallback((commitText, tone) => {
    const parsed = parseCommitMessages(commitText, tone);
    if (parsed.length === 0) return { parsed: [], grouped: {} };
    const categorized = groupByCategory(parsed);
    return { parsed, grouped: categorized };
  }, []);

  // AI-based processing (supports WebLLM progress callback)
  const processWithAI = useCallback(async (commitText, tone, setLoadingText) => {
    const lines = commitText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return null;

    try {
      const onProgress = (report) => {
        if (setLoadingText && report?.text) {
          setLoadingText(report.text);
        }
      };
      const aiResults = await processCommitsWithAI(lines, aiConfig, tone, onProgress);
      // Convert AI results to our internal format
      const parsed = aiResults.map((r) => ({
        raw: r.original,
        humanized: r.humanized,
        category: r.category,
        type: r.category,
      }));

      // Group them
      const grouped = {};
      for (const commit of parsed) {
        const cat = commit.category || 'chores';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(commit);
      }
      return { parsed, grouped };
    } catch (err) {
      console.warn('AI processing failed, falling back to regex:', err.message);
      return null; // Signal to fall back
    }
  }, [aiConfig]);

  // Initial commit load
  const handleCommitsReady = useCallback(async (commitText, repoInfoData) => {
    setLoading(true);
    setError(null);
    setRepoInfo(repoInfoData || null);
    rawCommitTextRef.current = commitText;
    setCategoryOrder(null);
    setLoadingText('');

    try {
      let parsed, categorized;

      if (aiConfig.enabled) {
        setLoadingText(`Processing with ${PROVIDERS[aiConfig.provider]?.name || aiConfig.provider}...`);
        // Try AI first
        const aiResult = await processWithAI(commitText, config.tone, setLoadingText);
        if (aiResult) {
          parsed = aiResult.parsed;
          categorized = aiResult.grouped;
        } else {
          // Fallback to regex
          const result = processCommits(commitText, config.tone);
          parsed = result.parsed;
          categorized = result.grouped;
        }
      } else {
        // Use a brief delay for UX
        await new Promise((r) => setTimeout(r, 600));
        const result = processCommits(commitText, config.tone);
        parsed = result.parsed;
        categorized = result.grouped;
      }

      if (!parsed || parsed.length === 0) {
        setError('No valid commits found. Please check your input format.');
        setLoading(false);
        return;
      }

      setCommits(parsed);
      setGrouped(categorized);
      setCategoryOrder(Object.keys(categorized));
      setShowResults(true);

      // Save to history
      const md = generateMarkdown(categorized, config.version, config.date, config.showOriginal, config.audience);
      const categories = {};
      for (const [k, v] of Object.entries(categorized)) {
        categories[k] = v.length;
      }
      addToHistory({
        version: config.version,
        tone: config.tone,
        commitCount: parsed.length,
        repoName: repoInfoData?.name || null,
        categories,
        markdown: md,
        rawText: commitText,
        grouped: categorized,
        commits: parsed,
      });

      setLoading(false);
    } catch (err) {
      setError('Error processing commits: ' + err.message);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processCommits, processWithAI, aiConfig.enabled, config.tone, config.version, config.date, config.showOriginal]);

  // Re-process when tone changes
  useEffect(() => {
    if (!showResults || !rawCommitTextRef.current) return;
    try {
      const { parsed, grouped: categorized } = processCommits(rawCommitTextRef.current, config.tone);
      setCommits(parsed);
      setGrouped(categorized);
      if (!categoryOrder) setCategoryOrder(Object.keys(categorized));
    } catch (err) {
      // silently ignore re-process errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tone, showResults, processCommits]);

  // Stats
  const stats = {};
  if (grouped) {
    stats.total = commits.length;
    for (const [key, items] of Object.entries(grouped)) {
      stats[key] = items.length;
    }
  }

  // Reorder handler
  const handleReorder = useCallback((type, data) => {
    if (type === 'category') {
      // Swap category positions
      setCategoryOrder((prev) => {
        if (!prev) return prev;
        const order = [...prev];
        const fromIdx = order.indexOf(data.from);
        const toIdx = order.indexOf(data.to);
        if (fromIdx === -1 || toIdx === -1) return prev;
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, data.from);
        return order;
      });
    } else if (type === 'item') {
      setGrouped((prev) => {
        if (!prev) return prev;
        const newGrouped = { ...prev };
        const fromItems = [...(newGrouped[data.fromCat] || [])];
        const toItems = data.fromCat === data.toCat ? fromItems : [...(newGrouped[data.toCat] || [])];

        const [moved] = fromItems.splice(data.fromIdx, 1);
        if (data.fromCat === data.toCat) {
          fromItems.splice(data.toIdx, 0, moved);
          newGrouped[data.fromCat] = fromItems;
        } else {
          toItems.splice(data.toIdx, 0, moved);
          newGrouped[data.fromCat] = fromItems;
          newGrouped[data.toCat] = toItems;
        }
        return newGrouped;
      });
    }
  }, []);

  // Inline edit handler
  const handleEditItem = useCallback((catKey, idx, newText) => {
    setGrouped((prev) => {
      if (!prev || !prev[catKey]) return prev;
      const newGrouped = { ...prev };
      const items = [...newGrouped[catKey]];
      items[idx] = { ...items[idx], humanized: newText };
      newGrouped[catKey] = items;
      return newGrouped;
    });
  }, []);

  // History restore handler
  const handleRestoreHistory = useCallback((entry) => {
    if (entry.grouped && entry.commits) {
      setGrouped(entry.grouped);
      setCommits(entry.commits);
      setCategoryOrder(Object.keys(entry.grouped));
      setShowResults(true);
      setConfig((prev) => ({
        ...prev,
        version: entry.version || prev.version,
        tone: entry.tone || prev.tone,
      }));
      if (entry.rawText) rawCommitTextRef.current = entry.rawText;
      if (entry.repoName) setRepoInfo({ name: entry.repoName });
    }
  }, []);

  // Reset
  const handleReset = () => {
    setCommits([]);
    setGrouped(null);
    setCategoryOrder(null);
    setShowResults(false);
    setRepoInfo(null);
    setError(null);
    rawCommitTextRef.current = '';
  };

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} theme={theme} onToggleTheme={toggleTheme} />
      <main className="main-content">
        {activeTab === 'generator' && !showResults && <Hero />}

        {/* ===== VERSION DIFF TAB ===== */}
        {activeTab === 'diff' && (
          <ChangelogDiff />
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {/* ===== RELEASE HEALTH TAB ===== */}
        {activeTab === 'health' && (
          <HealthTab />
        )}

        {/* ===== COMMIT QUALITY TAB ===== */}
        {activeTab === 'quality' && (
          <QualityTab />
        )}

        {activeTab !== 'generator' ? null : (
        <>

        {/* Error */}
        {error && (
          <div
            className="toast error"
            style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: 16 }}
          >
            <span>❌</span>
            <span>{error}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Section */}
        {!showResults && !loading && (
          <>
            {/* AI Config */}
            <AIConfigPanel aiConfig={aiConfig} onConfigChange={setAiConfig} />

            <CommitInput
              onCommitsReady={handleCommitsReady}
              setLoading={setLoading}
              setError={setError}
            />

            {/* Changelog History */}
            <ChangelogHistory onRestore={handleRestoreHistory} />
          </>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <LoadingSkeleton
            text={loadingText || (aiConfig.enabled ? 'AI is analyzing your commits...' : 'Generating your changelog...')}
            subtext={aiConfig.enabled
              ? `Using ${PROVIDERS[aiConfig.provider]?.name || aiConfig.provider} to humanize commit messages`
              : 'Enhanced regex engine — 80+ patterns for smart humanization'}
          />
        )}

        {/* Results */}
        {showResults && !loading && (
          <>
            {/* Back / Reset */}
            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                ← Back to Input
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {commits.length} commits processed
                {aiConfig.enabled && <span className="ai-processed-badge">AI</span>}
              </span>
            </div>

            {/* Config */}
            <ConfigPanel config={config} onChange={setConfig} />

            {/* Before/After Comparison */}
            <ComparisonView commits={commits} grouped={grouped} />

            {/* Changelog Output */}
            <ChangelogOutput
              grouped={grouped}
              config={config}
              stats={stats}
              repoInfo={repoInfo}
              onReorder={handleReorder}
              onEditItem={handleEditItem}
              categoryOrder={categoryOrder}
            />

            {/* Export */}
            <ExportPanel
              grouped={grouped}
              config={config}
              stats={stats}
              repoInfo={repoInfo}
            />
          </>
        )}
        </>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ============================================
   RELEASE HEALTH TAB — standalone page
   ============================================ */
function HealthTab() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const h = loadHistoryEntries();
    setHistory(h);
    if (h.length > 0) setSelected(h[0]);
  }, []);

  const stats = {};
  if (selected?.grouped) {
    stats.total = selected.commitCount || 0;
    for (const [key, items] of Object.entries(selected.grouped)) {
      stats[key] = items.length;
    }
  }

  // Re-score commits for the selected entry
  const qualityScore = React.useMemo(() => {
    if (!selected?.commits) return null;
    const rawMessages = selected.commits.map((c) => c.raw).filter(Boolean);
    if (rawMessages.length === 0) return null;
    return scoreAllCommits(rawMessages);
  }, [selected]);

  return (
    <div className="metrics-tab">
      <div className="metrics-tab-header">
        <h2 className="metrics-tab-title">Release Health Dashboard</h2>
        <p className="metrics-tab-desc">Analyze the health metrics of any past changelog</p>
      </div>

      {history.length === 0 ? (
        <div className="metrics-empty">
          <span className="metrics-empty-icon">📊</span>
          <p>No changelog history yet. Generate a changelog first to see release health metrics.</p>
        </div>
      ) : (
        <>
          <HistorySelector entries={history} selected={selected} onSelect={setSelected} />
          {selected?.grouped && (
            <ReleaseHealthDashboard
              grouped={selected.grouped}
              stats={stats}
              qualityScore={qualityScore}
              forceOpen
            />
          )}
        </>
      )}
    </div>
  );
}

/* ============================================
   COMMIT QUALITY TAB — standalone page
   ============================================ */
function QualityTab() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const h = loadHistoryEntries();
    setHistory(h);
    if (h.length > 0) setSelected(h[0]);
  }, []);

  const qualityScore = React.useMemo(() => {
    if (!selected?.commits) return null;
    const rawMessages = selected.commits.map((c) => c.raw).filter(Boolean);
    if (rawMessages.length === 0) return null;
    return scoreAllCommits(rawMessages);
  }, [selected]);

  return (
    <div className="metrics-tab">
      <div className="metrics-tab-header">
        <h2 className="metrics-tab-title">Commit Quality Score</h2>
        <p className="metrics-tab-desc">Review commit quality metrics across your changelog history</p>
      </div>

      {history.length === 0 ? (
        <div className="metrics-empty">
          <span className="metrics-empty-icon">🏆</span>
          <p>No changelog history yet. Generate a changelog first to see quality scores.</p>
        </div>
      ) : (
        <>
          <HistorySelector entries={history} selected={selected} onSelect={setSelected} />
          {qualityScore && (
            <CommitQualityPanel qualityData={qualityScore} forceOpen />
          )}
        </>
      )}
    </div>
  );
}

/* ============================================
   SHARED: History Entry Selector
   ============================================ */
function HistorySelector({ entries, selected, onSelect }) {
  return (
    <div className="history-selector">
      <label className="history-selector-label">Select Changelog:</label>
      <div className="history-selector-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            className={`history-selector-item ${selected?.id === entry.id ? 'active' : ''}`}
            onClick={() => onSelect(entry)}
          >
            <span className="history-selector-version">
              {entry.version ? `v${entry.version}` : entry.repoName || formatDate(entry.timestamp)}
            </span>
            <span className="history-selector-meta">
              {entry.commitCount} commits
              {entry.repoName ? ` · ${entry.repoName}` : ''}
              {' · '}{formatDate(entry.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Load changelog history from localStorage */
function loadHistoryEntries() {
  try {
    const saved = localStorage.getItem('changelog_history');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/* ============================================
   ANALYTICS OVER TIME TAB
   ============================================ */
function AnalyticsTab() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadHistoryEntries());
  }, []);

  // Build data points from history (oldest → newest)
  const dataPoints = React.useMemo(() => {
    if (history.length === 0) return [];

    return [...history].reverse().map((entry) => {
      const total = entry.commitCount || 0;
      const cats = entry.categories || {};
      const featureRatio = total > 0 ? ((cats.features || 0) / total) * 100 : 0;
      const bugRatio = total > 0 ? ((cats.bugfixes || 0) / total) * 100 : 0;
      const breakingRatio = total > 0 ? ((cats.breaking || 0) / total) * 100 : 0;
      const perfRatio = total > 0 ? ((cats.performance || 0) / total) * 100 : 0;

      let healthScore = Math.round(
        Math.min(100, 50 + featureRatio * 0.3 - bugRatio * 0.2 - breakingRatio * 0.5 + perfRatio * 0.15)
      );
      healthScore = Math.max(0, Math.min(100, healthScore));

      // Quality score
      let qualityAvg = 0;
      if (entry.commits && entry.commits.length > 0) {
        const rawMsgs = entry.commits.map((c) => c.raw).filter(Boolean);
        if (rawMsgs.length > 0) {
          const scored = scoreAllCommits(rawMsgs);
          qualityAvg = scored.average;
        }
      }

      const label = entry.version ? `v${entry.version}` : entry.repoName || formatDate(entry.timestamp);

      return {
        id: entry.id,
        version: label,
        date: entry.timestamp,
        healthScore,
        qualityAvg,
        commitCount: total,
        features: cats.features || 0,
        bugfixes: cats.bugfixes || 0,
        breaking: cats.breaking || 0,
      };
    });
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="metrics-tab">
        <div className="metrics-tab-header">
          <h2 className="metrics-tab-title">Analytics Over Time</h2>
          <p className="metrics-tab-desc">Track release health and commit quality trends</p>
        </div>
        <div className="metrics-empty">
          <span className="metrics-empty-icon">📈</span>
          <p>No changelog history yet. Generate changelogs to see trends over time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-tab">
      <div className="metrics-tab-header">
        <h2 className="metrics-tab-title">Analytics Over Time</h2>
        <p className="metrics-tab-desc">
          Tracking {dataPoints.length} changelog{dataPoints.length !== 1 ? 's' : ''} over time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="analytics-card">
          <div className="analytics-card-value" style={{ color: 'var(--success)' }}>
            {dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].healthScore : '—'}
          </div>
          <div className="analytics-card-label">Latest Health</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-card-value" style={{ color: 'var(--text-accent)' }}>
            {dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].qualityAvg : '—'}
          </div>
          <div className="analytics-card-label">Latest Quality</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-card-value" style={{ color: 'var(--warning)' }}>
            {dataPoints.reduce((s, d) => s + d.commitCount, 0)}
          </div>
          <div className="analytics-card-label">Total Commits</div>
        </div>
        <div className="analytics-card">
          <div className="analytics-card-value" style={{ color: 'var(--breaking-color)' }}>
            {dataPoints.length}
          </div>
          <div className="analytics-card-label">Releases</div>
        </div>
        <div className="analytics-card" title="Estimated at ~2 min saved per commit vs. manual changelog writing">
          {(() => {
            const totalMins = dataPoints.reduce((s, d) => s + d.commitCount, 0) * 2;
            const isHours = totalMins >= 60;
            return (
              <>
                <div className="analytics-card-value" style={{ color: 'var(--accent-primary)' }}>
                  {isHours ? `${(totalMins / 60).toFixed(1)}h` : `${totalMins}m`}
                </div>
                <div className="analytics-card-label">{isHours ? 'Hours' : 'Minutes'} Saved</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Health Score Chart */}
      <div className="analytics-chart-section">
        <h3 className="analytics-chart-title">Release Health Trend</h3>
        <TrendChart dataPoints={dataPoints} valueKey="healthScore" color="var(--success)" max={100} />
      </div>

      {/* Quality Score Chart */}
      <div className="analytics-chart-section">
        <h3 className="analytics-chart-title">Commit Quality Trend</h3>
        <TrendChart dataPoints={dataPoints} valueKey="qualityAvg" color="var(--text-accent)" max={100} />
      </div>

      {/* Commit Volume Chart */}
      <div className="analytics-chart-section">
        <h3 className="analytics-chart-title">Commit Volume</h3>
        <BarChart dataPoints={dataPoints} />
      </div>

      {/* Data Table */}
      <div className="analytics-chart-section">
        <h3 className="analytics-chart-title">Release History</h3>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Commits</th>
                <th>Health</th>
                <th>Quality</th>
                <th>Features</th>
                <th>Fixes</th>
                <th>Breaking</th>
              </tr>
            </thead>
            <tbody>
              {[...dataPoints].reverse().map((dp) => (
                <tr key={dp.id}>
                  <td className="analytics-td-version">{dp.version}</td>
                  <td>{dp.commitCount}</td>
                  <td>
                    <span className="analytics-score" style={{ color: dp.healthScore >= 70 ? 'var(--success)' : dp.healthScore >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                      {dp.healthScore}
                    </span>
                  </td>
                  <td>
                    <span className="analytics-score" style={{ color: dp.qualityAvg >= 70 ? 'var(--success)' : dp.qualityAvg >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                      {dp.qualityAvg}
                    </span>
                  </td>
                  <td>{dp.features}</td>
                  <td>{dp.bugfixes}</td>
                  <td>{dp.breaking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---- SVG Trend Line Chart ---- */
function TrendChart({ dataPoints, valueKey, color, max }) {
  if (dataPoints.length < 2) {
    return (
      <div className="analytics-chart-single">
        <span className="analytics-chart-single-value" style={{ color }}>
          {dataPoints[0]?.[valueKey] ?? '—'}
        </span>
        <span className="analytics-chart-single-label">Only one data point — generate more changelogs to see trends</span>
      </div>
    );
  }

  const W = 600, H = 200, PAD = 40;
  const values = dataPoints.map((d) => d[valueKey]);
  const minV = 0;
  const maxV = max || Math.max(...values, 1);

  const points = dataPoints.map((d, i) => {
    const x = PAD + (i / (dataPoints.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d[valueKey] - minV) / (maxV - minV)) * (H - PAD * 2);
    return { x, y, val: d[valueKey], version: d.version };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z`;

  return (
    <div className="analytics-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="analytics-svg">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);
          return (
            <React.Fragment key={v}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{v}</text>
            </React.Fragment>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill={color} opacity="0.1" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots + labels */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            <text x={p.x} y={H - PAD + 16} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
              {p.version.length > 8 ? p.version.slice(0, 8) + '..' : p.version}
            </text>
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600">
              {p.val}
            </text>
          </React.Fragment>
        ))}
      </svg>
    </div>
  );
}

/* ---- SVG Bar Chart for commit volume ---- */
function BarChart({ dataPoints }) {
  const W = 600, H = 210, PAD_TOP = 20, PAD_BOTTOM = 70, PAD_X = 40;
  const maxVal = Math.max(...dataPoints.map((d) => d.commitCount), 1);
  const barWidth = Math.min(40, (W - PAD_X * 2) / dataPoints.length - 8);
  const labelSize = dataPoints.length > 8 ? 7 : dataPoints.length > 5 ? 8 : 9;
  const maxLabelLen = dataPoints.length > 6 ? 10 : 14;

  const trimLabel = (str) => str.length > maxLabelLen ? str.slice(0, maxLabelLen) + '..' : str;

  return (
    <div className="analytics-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="analytics-svg">
        {dataPoints.map((d, i) => {
          const x = PAD_X + (i / dataPoints.length) * (W - PAD_X * 2) + barWidth / 2;
          const barH = (d.commitCount / maxVal) * (H - PAD_TOP - PAD_BOTTOM);
          const y = H - PAD_BOTTOM - barH;
          const labelX = x + barWidth / 2;
          const labelY = H - PAD_BOTTOM + 10;
          return (
            <React.Fragment key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill="var(--accent-primary)" opacity="0.7" />
              <text x={labelX} y={y - 6} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600">
                {d.commitCount}
              </text>
              <text
                x={labelX}
                y={labelY}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize={labelSize}
                transform={`rotate(-35, ${labelX}, ${labelY})`}
              >
                {trimLabel(d.version)}
              </text>
            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
}

export default App;
