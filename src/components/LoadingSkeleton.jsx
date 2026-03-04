import React from 'react';

export default function LoadingSkeleton({ text, subtext }) {
  return (
    <div className="skeleton-container">
      {/* Skeleton header */}
      <div className="skeleton-header">
        <div className="skeleton-pulse skeleton-title-bar" />
        <div className="skeleton-pulse skeleton-subtitle-bar" />
      </div>

      {/* Skeleton stat cards */}
      <div className="skeleton-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-pulse skeleton-stat-value" />
            <div className="skeleton-pulse skeleton-stat-label" />
          </div>
        ))}
      </div>

      {/* Skeleton category blocks */}
      {[1, 2, 3].map((cat) => (
        <div key={cat} className="skeleton-category">
          <div className="skeleton-category-header">
            <div className="skeleton-pulse skeleton-emoji" />
            <div className="skeleton-pulse skeleton-cat-title" />
            <div className="skeleton-pulse skeleton-cat-count" />
          </div>
          <div className="skeleton-items">
            {Array.from({ length: cat === 1 ? 4 : cat === 2 ? 3 : 2 }).map((_, j) => (
              <div key={j} className="skeleton-item">
                <div className="skeleton-pulse skeleton-bullet" />
                <div className="skeleton-pulse skeleton-item-text" style={{ width: `${60 + Math.random() * 30}%` }} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Overlay message */}
      <div className="skeleton-overlay">
        <div className="loading-spinner" />
        <div className="skeleton-overlay-text">{text || 'Generating your changelog...'}</div>
        {subtext && <div className="skeleton-overlay-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
