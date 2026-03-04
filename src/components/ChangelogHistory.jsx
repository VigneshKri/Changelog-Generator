import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'changelog_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export function addToHistory(entry) {
  const history = loadHistory();
  const newEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  // Keep last 50 entries
  const updated = [newEntry, ...history].slice(0, 50);
  saveHistory(updated);
  return updated;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function ChangelogHistory({ onRestore }) {
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchSummary, setBatchSummary] = useState(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleDelete = (id) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    setHistory(updated);
  };

  const handleToggleStatus = (id) => {
    const updated = history.map((h) =>
      h.id === id ? { ...h, status: h.status === 'final' ? 'draft' : 'final' } : h
    );
    saveHistory(updated);
    setHistory(updated);
  };

  const handleClearAll = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRestore = (entry) => {
    if (onRestore) onRestore(entry);
  };

  /** Export all history as a JSON backup file */
  const handleBackup = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Import history from a JSON backup file */
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        // Merge: imported entries that don't already exist (by id)
        const existingIds = new Set(history.map((h) => h.id));
        const newEntries = imported.filter((entry) => entry.id && !existingIds.has(entry.id));
        const merged = [...newEntries, ...history].slice(0, 50);
        saveHistory(merged);
        setHistory(merged);
        setImportMsg(`Imported ${newEntries.length} new changelog${newEntries.length !== 1 ? 's' : ''}`);
        setTimeout(() => setImportMsg(null), 3000);
      } catch {
        setImportMsg('Invalid backup file');
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /** Toggle a single entry in the batch selection */
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBatchSummary(null);
  };

  /** Generate a combined summary from selected entries */
  const handleGenerateSummary = () => {
    const selected = history.filter((h) => selectedIds.has(h.id));
    if (selected.length < 2) return;

    let totalCommits = 0;
    const combinedCats = {};
    const versions = [];

    for (const entry of selected) {
      totalCommits += entry.commitCount || 0;
      versions.push(entry.version || entry.repoName || new Date(entry.timestamp).toLocaleDateString());
      if (entry.categories) {
        for (const [cat, count] of Object.entries(entry.categories)) {
          combinedCats[cat] = (combinedCats[cat] || 0) + count;
        }
      }
    }

    const lines = [`# Combined Release Summary`, ``, `> Covering ${selected.length} releases: ${versions.join(', ')}`, `> Total commits: ${totalCommits}`, ``];
    for (const [cat, count] of Object.entries(combinedCats)) {
      lines.push(`- **${cat}**: ${count} change${count !== 1 ? 's' : ''}`);
    }

    setBatchSummary(lines.join('\n'));
  };

  const handleCopySummary = async () => {
    if (!batchSummary) return;
    try { await navigator.clipboard.writeText(batchSummary); } catch {}
  };

  const formatDate = (dateStr) => {
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
  };

  return (
    <div className="history-panel">
      <div className="history-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="history-title">
          <span>Changelog History</span>
          {history.length > 0 && (
            <span className="history-count">{history.length}</span>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {isOpen ? '▼' : '▶'}
        </span>
      </div>

      {isOpen && (
        <div className="history-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <span>No saved changelogs yet. Generate one to see it here.</span>
            </div>
          ) : (
            <>
              <div className="history-actions">
                <span className="history-info">{history.length} saved changelog{history.length !== 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleBackup} title="Download backup">
                    Backup
                  </button>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }} title="Import from backup file">
                    Restore
                    <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>
                    Clear All
                  </button>
                </div>
              </div>
              {importMsg && (
                <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-accent)', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 8 }}>
                  {importMsg}
                </div>
              )}
              {selectedIds.size >= 2 && (
                <div className="batch-action-bar">
                  <span>{selectedIds.size} selected</span>
                  <button className="btn btn-primary btn-sm" onClick={handleGenerateSummary}>
                    Generate Summary
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedIds(new Set()); setBatchSummary(null); }}>
                    Clear Selection
                  </button>
                </div>
              )}
              {batchSummary && (
                <div className="batch-summary">
                  <div className="batch-summary-header">
                    <strong>Combined Release Summary</strong>
                    <button className="btn btn-ghost btn-sm" onClick={handleCopySummary}>Copy</button>
                  </div>
                  <pre className="batch-summary-content">{batchSummary}</pre>
                </div>
              )}
              <div className="history-list">
                {history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`history-item ${selectedIds.has(entry.id) ? 'history-item-selected' : ''}`}
                    onClick={() => handleRestore(entry)}
                    style={{ cursor: 'pointer' }}
                    title="Click to load this changelog"
                  >
                    <label className="history-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => handleToggleSelect(entry.id)}
                      />
                    </label>
                    <div className="history-item-main">
                      <div className="history-item-header">
                        <span className="history-version">
                          {entry.version ? `v${entry.version}` : entry.repoName || `Changelog #${index + 1}`}
                        </span>
                        <span className={`history-status-badge ${entry.status === 'final' ? 'status-final' : 'status-draft'}`}>
                          {entry.status === 'final' ? 'Final' : 'Draft'}
                        </span>
                        <span className="history-time">{formatDate(entry.timestamp)}</span>
                      </div>
                      <div className="history-item-meta">
                        <span>{entry.commitCount || 0} commits</span>
                        <span>•</span>
                        <span>{entry.tone || 'professional'}</span>
                        {entry.repoName && (
                          <>
                            <span>•</span>
                            <span>{entry.repoName}</span>
                          </>
                        )}
                      </div>
                      {/* Category summary */}
                      {entry.categories && (
                        <div className="history-item-categories">
                          {Object.entries(entry.categories).map(([key, count]) => (
                            <span key={key} className={`history-cat-badge bg-${key}`}>
                              {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="history-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`btn btn-ghost btn-sm ${entry.status === 'final' ? 'status-btn-final' : ''}`}
                        onClick={() => handleToggleStatus(entry.id)}
                        title={entry.status === 'final' ? 'Mark as Draft' : 'Mark as Final'}
                      >
                        {entry.status === 'final' ? 'Revert to Draft' : 'Mark Final'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPreviewId(previewId === entry.id ? null : entry.id)}
                        title="Preview markdown"
                      >
                        View
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Preview */}
                    {previewId === entry.id && entry.markdown && (
                      <div className="history-preview">
                        <pre>{entry.markdown.slice(0, 500)}{entry.markdown.length > 500 ? '\n...' : ''}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
