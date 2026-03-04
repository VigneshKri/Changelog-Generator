import React, { useState, useRef } from 'react';
import { CATEGORIES, STAKEHOLDER_TITLES } from '../utils/changelogEngine';

export default function ChangelogOutput({
  grouped,
  config,
  stats,
  repoInfo,
  onReorder,
  onEditItem,
  categoryOrder,
}) {
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingItem, setEditingItem] = useState(null); // { catKey, idx }
  const [editText, setEditText] = useState('');
  const [dragCat, setDragCat] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [dragOverCat, setDragOverCat] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const editRef = useRef(null);

  const toggleCategory = (key) => {
    setCollapsedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---- Inline Editing ----
  const startEdit = (catKey, idx, currentText) => {
    setEditingItem({ catKey, idx });
    setEditText(currentText);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const saveEdit = () => {
    if (editingItem && onEditItem) {
      onEditItem(editingItem.catKey, editingItem.idx, editText);
    }
    setEditingItem(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditText('');
  };

  // ---- Category Drag & Drop ----
  const handleCatDragStart = (e, catKey) => {
    setDragCat(catKey);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleCatDragOver = (e, catKey) => {
    e.preventDefault();
    if (dragCat && dragCat !== catKey) {
      setDragOverCat(catKey);
    }
  };

  const handleCatDrop = (e, targetCatKey) => {
    e.preventDefault();
    if (dragCat && dragCat !== targetCatKey && onReorder) {
      onReorder('category', { from: dragCat, to: targetCatKey });
    }
    setDragCat(null);
    setDragOverCat(null);
  };

  const handleCatDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDragCat(null);
    setDragOverCat(null);
  };

  // ---- Item Drag & Drop ----
  const handleItemDragStart = (e, catKey, idx) => {
    setDragItem({ catKey, idx });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleItemDragOver = (e, catKey, idx) => {
    e.preventDefault();
    if (dragItem && (dragItem.catKey !== catKey || dragItem.idx !== idx)) {
      setDragOverItem({ catKey, idx });
    }
  };

  const handleItemDrop = (e, targetCatKey, targetIdx) => {
    e.preventDefault();
    if (dragItem && onReorder) {
      onReorder('item', {
        fromCat: dragItem.catKey,
        fromIdx: dragItem.idx,
        toCat: targetCatKey,
        toIdx: targetIdx,
      });
    }
    setDragItem(null);
    setDragOverItem(null);
  };

  const handleItemDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDragItem(null);
    setDragOverItem(null);
  };

  if (!grouped || Object.keys(grouped).length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">No changelog generated yet</div>
        <div className="empty-state-subtext">
          Paste your commits or connect to GitHub to get started
        </div>
      </div>
    );
  }

  // Use provided order or default
  const orderedKeys = categoryOrder || Object.keys(grouped);

  return (
    <div className="output-section">
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {stats.total}
          </div>
          <div className="stat-label">Total Commits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--feature-color)' }}>
            {stats.features || 0}
          </div>
          <div className="stat-label">Features</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--bugfix-color)' }}>
            {stats.bugfixes || 0}
          </div>
          <div className="stat-label">Bug Fixes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--performance-color)' }}>
            {stats.performance || 0}
          </div>
          <div className="stat-label">Performance</div>
        </div>
        {orderedKeys.length > 3 && (
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
              {orderedKeys.length}
            </div>
            <div className="stat-label">Categories</div>
          </div>
        )}
      </div>

      {/* Repo Info */}
      {repoInfo && (
        <div className="output-meta">
          <span className="meta-badge">📦 {repoInfo.name}</span>
          {repoInfo.language && (
            <span className="meta-badge">
              <span className="dot" style={{ background: 'var(--accent-primary)' }} />
              {repoInfo.language}
            </span>
          )}
          {repoInfo.stars !== undefined && (
            <span className="meta-badge">⭐ {repoInfo.stars.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Version & Date Header */}
      <div className="output-header">
        <h2 className="output-title">
          <span>📋</span>
          {config.version ? `v${config.version}` : 'Changelog'}
          {config.date && <span className="date-display">({config.date})</span>}
        </h2>
        <div className="reorder-hint">
          <span className="reorder-icon">⇕</span> Drag to reorder categories & items
        </div>
      </div>

      {/* Category Sections — Draggable */}
      {orderedKeys.filter((k) => grouped[k]).map((catKey) => {
        const items = grouped[catKey];
        const cat = CATEGORIES[catKey];
        if (!cat) return null;
        const isCollapsed = collapsedCategories[catKey];
        const isDragOverThis = dragOverCat === catKey;

        return (
          <div
            key={catKey}
            className={`changelog-category ${isDragOverThis ? 'drag-over-category' : ''}`}
            draggable
            onDragStart={(e) => handleCatDragStart(e, catKey)}
            onDragOver={(e) => handleCatDragOver(e, catKey)}
            onDrop={(e) => handleCatDrop(e, catKey)}
            onDragEnd={handleCatDragEnd}
          >
            <div className="category-header" onClick={() => toggleCategory(catKey)}>
              <div className="category-title">
                <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                <span className="category-emoji">{cat.emoji}</span>
                <span className={`color-${cat.color}`}>{config?.audience === 'stakeholder' ? (STAKEHOLDER_TITLES[catKey] || cat.title) : cat.title}</span>
                <span className="category-count">{items.length}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {isCollapsed ? '▶' : '▼'}
              </span>
            </div>
            {!isCollapsed && (
              <div className="category-items">
                {items.map((item, idx) => {
                  const isEditing = editingItem?.catKey === catKey && editingItem?.idx === idx;
                  const isDragOverItemHere = dragOverItem?.catKey === catKey && dragOverItem?.idx === idx;

                  return (
                    <div
                      key={idx}
                      className={`changelog-item ${isDragOverItemHere ? 'drag-over-item' : ''}`}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); handleItemDragStart(e, catKey, idx); }}
                      onDragOver={(e) => { e.stopPropagation(); handleItemDragOver(e, catKey, idx); }}
                      onDrop={(e) => { e.stopPropagation(); handleItemDrop(e, catKey, idx); }}
                      onDragEnd={handleItemDragEnd}
                    >
                      <div className="item-drag-handle" title="Drag to reorder">⋮</div>
                      <div className={`item-bullet bg-${cat.color}`} />
                      <div className="item-content">
                        {isEditing ? (
                          <div className="item-edit-wrapper">
                            <input
                              ref={editRef}
                              className="item-edit-input"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onBlur={saveEdit}
                            />
                            <div className="item-edit-actions">
                              <button className="btn btn-sm item-edit-btn save" onClick={saveEdit}>✓</button>
                              <button className="btn btn-sm item-edit-btn cancel" onClick={cancelEdit}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="item-title editable"
                            onClick={() => startEdit(catKey, idx, item.humanized)}
                            title="Click to edit"
                          >
                            {item.humanized}
                            <span className="edit-pencil">✎</span>
                          </div>
                        )}
                        {config.showOriginal && item.raw && (
                          <div className="item-original">
                            <span style={{ opacity: 0.6, marginRight: 4 }}>original →</span>
                            <code>{item.raw}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
