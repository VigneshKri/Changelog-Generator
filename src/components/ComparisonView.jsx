import React from 'react';

export default function ComparisonView({ commits, grouped }) {
  if (!commits || commits.length === 0 || !grouped || Object.keys(grouped).length === 0) {
    return null;
  }

  // Show all commits in scrollable panels
  const displayCommits = commits;

  // Flatten grouped for display
  const allHumanized = [];
  for (const [, items] of Object.entries(grouped)) {
    for (const item of items) {
      allHumanized.push(item);
    }
  }
  const displayHumanized = allHumanized;

  return (
    <div className="comparison-view">
      <div className="comparison-panel">
        <div className="comparison-panel-header before">
          <span>😵</span> Before — Raw Git Commits
        </div>
        <div className="comparison-content mono comparison-scroll">
          {displayCommits.map((c, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
              {c.raw}
            </div>
          ))}
        </div>
      </div>
      <div className="comparison-panel">
        <div className="comparison-panel-header after">
          <span>✨</span> After — User-Friendly Changelog
        </div>
        <div className="comparison-content pretty comparison-scroll">
          {displayHumanized.map((item, i) => {
            return (
              <div key={i} className="changelog-line" style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                {item.humanized}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function getCategoryEmoji(category) {
  const map = {
    features: '🎉',
    bugfixes: '🐛',
    performance: '⚡',
    breaking: '💥',
    docs: '📚',
    refactor: '♻️',
    chores: '🔧',
  };
  return map[category] || '📌';
}
