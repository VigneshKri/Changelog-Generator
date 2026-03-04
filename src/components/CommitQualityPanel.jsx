import React, { useState } from 'react';

export default function CommitQualityPanel({ qualityData, forceOpen = false }) {
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [showDetails, setShowDetails] = useState(false);

  if (!qualityData || !qualityData.scores || qualityData.scores.length === 0) return null;

  const { average, grade, distribution, total, conventionalPercent, topIssues, topSuggestions, scores } = qualityData;

  const gradeTooltips = {
    'A+': 'Exceptional: All commits follow conventional format with clear scope and descriptive bodies.',
    'A': 'Excellent: Most commits are well-structured and follow best practices.',
    'B': 'Good: Commits are generally decent but some lack conventional prefixes or detail.',
    'C': 'Needs Work: Many commits are vague or skip conventional format (e.g., "fix stuff").',
    'D': 'Poor: Most commits lack structure, context, or meaningful descriptions.',
    'F': 'Critical: Commits are mostly meaningless (e.g., "update", "wip", single words).',
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#34d399';
    if (score >= 80) return '#60a5fa';
    if (score >= 70) return '#fbbf24';
    if (score >= 50) return '#fb923c';
    return '#f87171';
  };

  return (
    <div className="quality-panel">
      <div className="quality-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="quality-title">
          <span>🏆</span>
          <span>Commit Quality Score</span>
          <span
            className="quality-grade-badge"
            style={{ background: grade.color + '22', color: grade.color, cursor: 'help' }}
            title={gradeTooltips[grade.letter] || `Score: ${average}/100 — based on conventional format, length, clarity, and structure.`}
          >
            {grade.letter} — {grade.label}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {isOpen ? '▼' : '▶'}
        </span>
      </div>

      {isOpen && (
        <div className="quality-body">
          {/* Score Summary */}
          <div className="quality-summary">
            <div className="quality-score-big" title="Weighted score: conventional format (30%), message length (20%), clarity (25%), scope (15%), body presence (10%)">
              <span className="quality-number" style={{ color: grade.color, cursor: 'help' }}>{average}</span>
              <span className="quality-max">/100</span>
            </div>
            <div className="quality-stats">
              <div className="quality-stat">
                <span className="quality-stat-value">{total}</span>
                <span className="quality-stat-label">Commits</span>
              </div>
              <div className="quality-stat">
                <span className="quality-stat-value">{conventionalPercent}%</span>
                <span className="quality-stat-label">Conventional</span>
              </div>
            </div>
          </div>

          {/* Distribution Bars */}
          <div className="quality-distribution">
            <div className="quality-dist-row">
              <span className="quality-dist-label" style={{ color: '#34d399' }} title="Commits with clear conventional prefix, scope, good length, and descriptive body">Excellent (90+)</span>
              <div className="quality-dist-bar-track">
                <div
                  className="quality-dist-bar"
                  style={{
                    width: `${total > 0 ? (distribution.excellent / total) * 100 : 0}%`,
                    background: '#34d399',
                  }}
                />
              </div>
              <span className="quality-dist-count">{distribution.excellent}</span>
            </div>
            <div className="quality-dist-row">
              <span className="quality-dist-label" style={{ color: '#60a5fa' }} title="Commits following conventional format with reasonable detail but missing some elements">Good (70-89)</span>
              <div className="quality-dist-bar-track">
                <div
                  className="quality-dist-bar"
                  style={{
                    width: `${total > 0 ? (distribution.good / total) * 100 : 0}%`,
                    background: '#60a5fa',
                  }}
                />
              </div>
              <span className="quality-dist-count">{distribution.good}</span>
            </div>
            <div className="quality-dist-row">
              <span className="quality-dist-label" style={{ color: '#fbbf24' }} title="Commits that are vague, too short, or skip conventional format">Needs Work (50-69)</span>
              <div className="quality-dist-bar-track">
                <div
                  className="quality-dist-bar"
                  style={{
                    width: `${total > 0 ? (distribution.needsWork / total) * 100 : 0}%`,
                    background: '#fbbf24',
                  }}
                />
              </div>
              <span className="quality-dist-count">{distribution.needsWork}</span>
            </div>
            <div className="quality-dist-row">
              <span className="quality-dist-label" style={{ color: '#f87171' }} title="Commits with single words, no structure, or meaningless messages like 'wip'">Poor (&lt;50)</span>
              <div className="quality-dist-bar-track">
                <div
                  className="quality-dist-bar"
                  style={{
                    width: `${total > 0 ? (distribution.poor / total) * 100 : 0}%`,
                    background: '#f87171',
                  }}
                />
              </div>
              <span className="quality-dist-count">{distribution.poor}</span>
            </div>
          </div>

          {/* Top Issues & Suggestions */}
          <div className="quality-insights">
            {topIssues.length > 0 && (
              <div className="quality-insight-section">
                <div className="quality-insight-title">⚠️ Common Issues</div>
                {topIssues.map((issue, i) => (
                  <div key={i} className="quality-insight-item issue">
                    <span>{issue.text}</span>
                    <span className="quality-insight-count">{issue.count}x</span>
                  </div>
                ))}
              </div>
            )}
            {topSuggestions.length > 0 && (
              <div className="quality-insight-section">
                <div className="quality-insight-title">💡 Suggestions</div>
                {topSuggestions.map((sug, i) => (
                  <div key={i} className="quality-insight-item suggestion">
                    <span>{sug.text}</span>
                    <span className="quality-insight-count">{sug.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-Commit Details Toggle */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowDetails(!showDetails)}
            style={{ marginTop: 12, width: '100%' }}
          >
            {showDetails ? '▲ Hide Details' : '▼ Show Per-Commit Scores'}
          </button>

          {showDetails && (
            <div className="quality-details">
              {scores.map((s, i) => (
                <div key={i} className="quality-detail-item">
                  <div className="quality-detail-score" style={{ color: getScoreColor(s.score) }}>
                    {s.score}
                  </div>
                  <div className="quality-detail-content">
                    <code className="quality-detail-raw">{s.raw}</code>
                    {s.issues.length > 0 && (
                      <div className="quality-detail-issues">
                        {s.issues.map((iss, j) => (
                          <span key={j} className="quality-tag issue-tag">⚠ {iss}</span>
                        ))}
                      </div>
                    )}
                    {s.suggestions.length > 0 && (
                      <div className="quality-detail-issues">
                        {s.suggestions.map((sug, j) => (
                          <span key={j} className="quality-tag suggestion-tag">💡 {sug}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
