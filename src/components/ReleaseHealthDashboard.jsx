import React, { useState } from 'react';
import { CATEGORIES } from '../utils/changelogEngine';

export default function ReleaseHealthDashboard({ grouped, stats, qualityScore, forceOpen = false }) {
  const [isOpen, setIsOpen] = useState(forceOpen);

  if (!grouped || !stats || !stats.total) return null;

  const total = stats.total;

  // Calculate health score (0-100)
  const featureRatio = ((stats.features || 0) / total) * 100;
  const bugRatio = ((stats.bugfixes || 0) / total) * 100;
  const breakingRatio = ((stats.breaking || 0) / total) * 100;

  // Health: more features + fewer bugs + fewer breaking = healthier
  let healthScore = Math.round(
    Math.min(100,
      50 + // base
      featureRatio * 0.3 - // reward features
      bugRatio * 0.2 - // penalize bugs
      breakingRatio * 0.5 + // penalize breaking more
      ((stats.performance || 0) / total) * 15 // small reward for perf
    )
  );
  healthScore = Math.max(0, Math.min(100, healthScore));

  const getHealthColor = (score) => {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#fbbf24';
    if (score >= 40) return '#fb923c';
    return '#f87171';
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  // Category distribution for bar chart
  const categoryEntries = Object.entries(grouped)
    .map(([key, items]) => ({
      key,
      count: items.length,
      percent: Math.round((items.length / total) * 100),
      cat: CATEGORIES[key],
    }))
    .sort((a, b) => b.count - a.count);

  // Release type determination
  const releaseType = breakingRatio > 0 ? 'Major' :
    featureRatio > bugRatio ? 'Feature Release' :
    bugRatio > featureRatio ? 'Patch / Hotfix' : 'Mixed';

  return (
    <div className="health-dashboard">
      <div className="health-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="health-title">
          <span>📊</span>
          <span>Release Health Dashboard</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {isOpen ? '▼' : '▶'}
        </span>
      </div>

      {isOpen && (
        <div className="health-body">
          {/* Top Row: Health Score + Release Type + Quality */}
          <div className="health-metrics">
            {/* Health Score Circle */}
            <div className="health-metric-card">
              <div className="health-score-circle" style={{ '--score-color': getHealthColor(healthScore) }}>
                <svg viewBox="0 0 120 120" className="health-ring">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={getHealthColor(healthScore)}
                    strokeWidth="8"
                    strokeDasharray={`${healthScore * 3.14} ${314 - healthScore * 3.14}`}
                    strokeDashoffset="78.5"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="health-score-value">
                  <span className="health-number" style={{ color: getHealthColor(healthScore) }}>
                    {healthScore}
                  </span>
                  <span className="health-label">{getHealthLabel(healthScore)}</span>
                </div>
              </div>
              <div className="health-metric-name">Release Health</div>
            </div>

            {/* Release Type */}
            <div className="health-metric-card">
              <div className="release-type-badge">{releaseType}</div>
              <div className="health-metric-name">Release Type</div>
              <div className="health-metric-detail">
                {(stats.features || 0)} features • {(stats.bugfixes || 0)} fixes
                {(stats.breaking || 0) > 0 && ` • ${stats.breaking} breaking`}
              </div>
            </div>

            {/* Quality Score */}
            {qualityScore && (
              <div className="health-metric-card">
                <div
                  className="quality-grade-large"
                  style={{ color: qualityScore.grade?.color || '#94a3b8' }}
                >
                  {qualityScore.grade?.letter || '?'}
                </div>
                <div className="health-metric-name">Commit Quality</div>
                <div className="health-metric-detail">
                  Avg: {qualityScore.average}/100 • {qualityScore.conventionalPercent}% conventional
                </div>
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="health-section">
            <div className="health-section-title">Category Distribution</div>
            <div className="health-bars">
              {categoryEntries.map(({ key, count, percent, cat }) => (
                <div key={key} className="health-bar-row">
                  <div className="health-bar-label">
                    <span className="health-bar-emoji">{cat?.emoji}</span>
                    <span>{cat?.title || key}</span>
                    <span className="health-bar-count">{count}</span>
                  </div>
                  <div className="health-bar-track">
                    <div
                      className={`health-bar-fill bg-${key}`}
                      style={{ width: `${percent}%`, transition: 'width 0.8s ease' }}
                    />
                  </div>
                  <span className="health-bar-percent">{percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacked Bar Visualization */}
          <div className="health-section">
            <div className="health-section-title">Commit Composition</div>
            <div className="health-stacked-bar">
              {categoryEntries.map(({ key, percent, cat }) => (
                <div
                  key={key}
                  className={`health-stacked-segment bg-${key}`}
                  style={{ width: `${Math.max(percent, 2)}%` }}
                  title={`${cat?.title}: ${percent}%`}
                />
              ))}
            </div>
            <div className="health-legend">
              {categoryEntries.map(({ key, cat }) => (
                <div key={key} className="health-legend-item">
                  <span className={`health-legend-dot bg-${key}`} />
                  <span>{cat?.title || key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
