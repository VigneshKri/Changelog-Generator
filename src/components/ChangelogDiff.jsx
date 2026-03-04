import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES } from '../utils/changelogEngine';

const STORAGE_KEY = 'changelog_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

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

function getLabel(entry) {
  return entry.version ? `v${entry.version}` : entry.repoName || formatDate(entry.timestamp);
}

/** Compute diff between two grouped changelogs */
function computeDiff(oldGrouped, newGrouped) {
  const allCats = new Set([
    ...Object.keys(oldGrouped || {}),
    ...Object.keys(newGrouped || {}),
  ]);

  const diff = { added: [], removed: [], unchanged: [], newCategories: [], removedCategories: [] };

  for (const cat of allCats) {
    const oldItems = (oldGrouped?.[cat] || []).map((i) => i.humanized);
    const newItems = (newGrouped?.[cat] || []).map((i) => i.humanized);

    if (oldItems.length === 0 && newItems.length > 0) {
      diff.newCategories.push(cat);
    } else if (oldItems.length > 0 && newItems.length === 0) {
      diff.removedCategories.push(cat);
    }

    const oldSet = new Set(oldItems);
    const newSet = new Set(newItems);

    for (const item of newItems) {
      if (!oldSet.has(item)) diff.added.push({ cat, text: item });
    }
    for (const item of oldItems) {
      if (!newSet.has(item)) diff.removed.push({ cat, text: item });
    }
    for (const item of newItems) {
      if (oldSet.has(item)) diff.unchanged.push({ cat, text: item });
    }
  }

  return diff;
}

export default function ChangelogDiff() {
  const [history, setHistory] = useState([]);
  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    if (h.length >= 2) {
      setLeftId(h[1].id);  // older
      setRightId(h[0].id); // newer
    } else if (h.length === 1) {
      setLeftId(h[0].id);
    }
  }, []);

  const leftEntry = history.find((h) => h.id === leftId) || null;
  const rightEntry = history.find((h) => h.id === rightId) || null;

  const diff = useMemo(() => {
    if (!leftEntry?.grouped || !rightEntry?.grouped) return null;
    return computeDiff(leftEntry.grouped, rightEntry.grouped);
  }, [leftEntry, rightEntry]);

  const leftStats = useMemo(() => {
    if (!leftEntry?.grouped) return {};
    const s = { total: leftEntry.commitCount || 0 };
    for (const [k, v] of Object.entries(leftEntry.grouped)) s[k] = v.length;
    return s;
  }, [leftEntry]);

  const rightStats = useMemo(() => {
    if (!rightEntry?.grouped) return {};
    const s = { total: rightEntry.commitCount || 0 };
    for (const [k, v] of Object.entries(rightEntry.grouped)) s[k] = v.length;
    return s;
  }, [rightEntry]);

  if (history.length < 2) {
    return (
      <div className="metrics-tab">
        <div className="metrics-tab-header">
          <h2 className="metrics-tab-title">Version Diff</h2>
          <p className="metrics-tab-desc">Compare two changelogs side-by-side to see what changed between releases</p>
        </div>
        <div className="metrics-empty">
          <span className="metrics-empty-icon">🔀</span>
          <p>You need at least 2 saved changelogs to compare. Generate more changelogs first.</p>
        </div>
      </div>
    );
  }

  const allCats = diff
    ? [...new Set([...Object.keys(leftEntry?.grouped || {}), ...Object.keys(rightEntry?.grouped || {})])]
    : [];

  return (
    <div className="metrics-tab">
      <div className="metrics-tab-header">
        <h2 className="metrics-tab-title">Version Diff</h2>
        <p className="metrics-tab-desc">Compare two changelogs side-by-side to see what changed between releases</p>
      </div>

      {/* Version Selectors */}
      <div className="diff-selectors">
        <div className="diff-selector">
          <label className="diff-selector-label">Base (older)</label>
          <select
            className="diff-select"
            value={leftId || ''}
            onChange={(e) => setLeftId(Number(e.target.value))}
          >
            <option value="" disabled>Select version...</option>
            {history.map((h) => (
              <option key={h.id} value={h.id} disabled={h.id === rightId}>
                {getLabel(h)} — {h.commitCount} commits — {formatDate(h.timestamp)}
              </option>
            ))}
          </select>
        </div>
        <div className="diff-arrow">→</div>
        <div className="diff-selector">
          <label className="diff-selector-label">Compare (newer)</label>
          <select
            className="diff-select"
            value={rightId || ''}
            onChange={(e) => setRightId(Number(e.target.value))}
          >
            <option value="" disabled>Select version...</option>
            {history.map((h) => (
              <option key={h.id} value={h.id} disabled={h.id === leftId}>
                {getLabel(h)} — {h.commitCount} commits — {formatDate(h.timestamp)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Diff Summary */}
      {diff && (
        <>
          <div className="diff-summary-cards">
            <div className="diff-summary-card diff-added">
              <div className="diff-summary-value">+{diff.added.length}</div>
              <div className="diff-summary-label">Added</div>
            </div>
            <div className="diff-summary-card diff-removed">
              <div className="diff-summary-value">-{diff.removed.length}</div>
              <div className="diff-summary-label">Removed</div>
            </div>
            <div className="diff-summary-card diff-unchanged-card">
              <div className="diff-summary-value">{diff.unchanged.length}</div>
              <div className="diff-summary-label">Unchanged</div>
            </div>
            {diff.newCategories.length > 0 && (
              <div className="diff-summary-card diff-new-cat">
                <div className="diff-summary-value">+{diff.newCategories.length}</div>
                <div className="diff-summary-label">New Categories</div>
              </div>
            )}
          </div>

          {/* Stat Comparison */}
          <div className="diff-stat-comparison">
            <h3 className="diff-section-title">Commit Breakdown</h3>
            <div className="diff-stat-grid">
              <div className="diff-stat-header">Category</div>
              <div className="diff-stat-header">{getLabel(leftEntry)}</div>
              <div className="diff-stat-header">{getLabel(rightEntry)}</div>
              <div className="diff-stat-header">Change</div>
              {allCats.map((catKey) => {
                const cat = CATEGORIES[catKey];
                if (!cat) return null;
                const oldCount = leftStats[catKey] || 0;
                const newCount = rightStats[catKey] || 0;
                const change = newCount - oldCount;
                return (
                  <React.Fragment key={catKey}>
                    <div className="diff-stat-cat">
                      <span>{cat.emoji}</span> {cat.title}
                    </div>
                    <div className="diff-stat-val">{oldCount}</div>
                    <div className="diff-stat-val">{newCount}</div>
                    <div className={`diff-stat-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : ''}`}>
                      {change > 0 ? `+${change}` : change === 0 ? '—' : change}
                    </div>
                  </React.Fragment>
                );
              })}
              <React.Fragment>
                <div className="diff-stat-cat" style={{ fontWeight: 700 }}>Total</div>
                <div className="diff-stat-val" style={{ fontWeight: 700 }}>{leftStats.total || 0}</div>
                <div className="diff-stat-val" style={{ fontWeight: 700 }}>{rightStats.total || 0}</div>
                <div className={`diff-stat-change ${(rightStats.total || 0) - (leftStats.total || 0) > 0 ? 'positive' : (rightStats.total || 0) - (leftStats.total || 0) < 0 ? 'negative' : ''}`} style={{ fontWeight: 700 }}>
                  {((rightStats.total || 0) - (leftStats.total || 0)) > 0 ? `+${(rightStats.total || 0) - (leftStats.total || 0)}` : ((rightStats.total || 0) - (leftStats.total || 0)) === 0 ? '—' : (rightStats.total || 0) - (leftStats.total || 0)}
                </div>
              </React.Fragment>
            </div>
          </div>

          {/* Side-by-side Added / Removed Tables */}
          {(diff.added.length > 0 || diff.removed.length > 0) && (
            <div className="diff-tables-row">
              {/* Added Table */}
              <div className="diff-table-col">
                <h3 className="diff-section-title diff-title-added">Added ({diff.added.length})</h3>
                <div className="diff-table-scroll">
                  <div className="diff-items">
                    {diff.added.length > 0 ? diff.added.map((item, i) => (
                      <div key={i} className="diff-item diff-item-added">
                        <span className="diff-item-cat">{CATEGORIES[item.cat]?.title || item.cat}</span>
                        <span className="diff-item-text">{item.text}</span>
                      </div>
                    )) : (
                      <div className="diff-empty-col">No items added</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Removed Table */}
              <div className="diff-table-col">
                <h3 className="diff-section-title diff-title-removed">Removed ({diff.removed.length})</h3>
                <div className="diff-table-scroll">
                  <div className="diff-items">
                    {diff.removed.length > 0 ? diff.removed.map((item, i) => (
                      <div key={i} className="diff-item diff-item-removed">
                        <span className="diff-item-cat">{CATEGORIES[item.cat]?.title || item.cat}</span>
                        <span className="diff-item-text">{item.text}</span>
                      </div>
                    )) : (
                      <div className="diff-empty-col">No items removed</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unchanged Items */}
          {diff.unchanged.length > 0 && (
            <div className="diff-section">
              <h3 className="diff-section-title diff-title-unchanged">Unchanged ({diff.unchanged.length})</h3>
              <div className="diff-items diff-items-collapsed">
                {diff.unchanged.map((item, i) => (
                  <div key={i} className="diff-item diff-item-unchanged">
                    <span className="diff-item-cat">{CATEGORIES[item.cat]?.title || item.cat}</span>
                    <span className="diff-item-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!diff && leftId && rightId && (
        <div className="metrics-empty">
          <span className="metrics-empty-icon">⏳</span>
          <p>Select two different versions to compare.</p>
        </div>
      )}
    </div>
  );
}
