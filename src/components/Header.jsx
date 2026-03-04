import React from 'react';

const TABS = [
  { key: 'generator', label: 'Generator' },
  { key: 'diff', label: 'Version Diff' },
  { key: 'health', label: 'Release Health' },
  { key: 'quality', label: 'Commit Quality' },
  { key: 'analytics', label: 'Analytics' },
];

export default function Header({ activeTab = 'generator', onTabChange, theme, onToggleTheme }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">📋</span>
        <div>
          <div className="header-title">Changelog Generator</div>
          <div className="header-subtitle">Git Commits → Release Notes</div>
        </div>
      </div>
      <nav className="header-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`header-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange?.(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        <span className="header-badge">AI-Powered</span>
      </div>
    </header>
  );
}
