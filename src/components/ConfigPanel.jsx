import React, { useState } from 'react';

export default function ConfigPanel({ config, onChange }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="config-panel">
      <div
        className="config-header"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>⚙️</span>
        <span>Output Settings</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
          {isOpen ? '▼' : '▶'}
        </span>
      </div>
      {isOpen && (
        <div className="config-grid">
          <div className="config-item">
            <label>Version</label>
            <input
              type="text"
              value={config.version}
              onChange={(e) => onChange({ ...config, version: e.target.value })}
              placeholder="e.g., 2.1.0"
            />
          </div>
          <div className="config-item">
            <label>Date</label>
            <input
              type="date"
              value={config.date}
              onChange={(e) => onChange({ ...config, date: e.target.value })}
            />
          </div>
          <div className="config-item">
            <label>Tone</label>
            <select
              value={config.tone}
              onChange={(e) => onChange({ ...config, tone: e.target.value })}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual & Friendly</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div className="config-item">
            <label>Audience</label>
            <div className="audience-toggle">
              <button
                className={`audience-btn ${(config.audience || 'end-user') === 'end-user' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, audience: 'end-user' })}
                title="Benefit-driven language for end users"
              >
                End-User
              </button>
              <button
                className={`audience-btn ${config.audience === 'stakeholder' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, audience: 'stakeholder' })}
                title="Milestone-driven language for internal stakeholders"
              >
                Stakeholder
              </button>
            </div>
          </div>
          <div className="config-item">
            <label>Show Original</label>
            <div
              className={`toggle-switch ${config.showOriginal ? 'active' : ''}`}
              onClick={() => onChange({ ...config, showOriginal: !config.showOriginal })}
              role="switch"
              aria-checked={config.showOriginal}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange({ ...config, showOriginal: !config.showOriginal });
                }
              }}
            >
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-label">
                {config.showOriginal ? 'Showing originals' : 'Hidden'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
