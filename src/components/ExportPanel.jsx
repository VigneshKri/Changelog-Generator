import React, { useState } from 'react';
import {
  generateMarkdown,
  generateHTML,
  generateSlack,
  generateJSON,
} from '../utils/changelogEngine';
import { generatePDF } from '../utils/pdfExport';

export default function ExportPanel({ grouped, config, stats, repoInfo }) {
  const [activeFormat, setActiveFormat] = useState('markdown');
  const [template, setTemplate] = useState('standard');
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!grouped || Object.keys(grouped).length === 0) return null;

  const templates = {
    standard: { label: 'Standard', description: 'Full detailed changelog' },
    minimalist: { label: 'Minimalist', description: 'Compact bullet list' },
    executive: { label: 'Executive', description: 'High-level summary for stakeholders' },
    social: { label: 'Social', description: 'Social media / announcement post' },
  };

  const formats = {
    markdown: { label: 'Markdown', icon: '📝' },
    html: { label: 'HTML', icon: '🌐' },
    slack: { label: 'Slack', icon: '💬' },
    json: { label: 'JSON', icon: '📦' },
  };

  const getOutput = () => {
    const { version, date, showOriginal, audience } = config;
    switch (activeFormat) {
      case 'markdown':
        return generateMarkdown(grouped, version, date, showOriginal, audience);
      case 'html':
        return generateHTML(grouped, version, date, showOriginal, audience);
      case 'slack':
        return generateSlack(grouped, version, date, showOriginal, audience);
      case 'json':
        return generateJSON(grouped, version, date, showOriginal, audience);
      default:
        return '';
    }
  };

  /** Apply template transformations to standard output */
  const applyTemplate = (raw) => {
    if (template === 'standard') return raw;

    const { version, date } = config;
    const totalChanges = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);
    const catNames = Object.keys(grouped);
    const catLabel = { features: 'New Features', bugfixes: 'Bug Fixes', performance: 'Performance', breaking: 'Breaking Changes', docs: 'Documentation', refactor: 'Refactoring', chores: 'Maintenance' };

    /* ---- Build template data ---- */
    let mdLines = [];
    let title = '';

    if (template === 'minimalist') {
      title = `${version ? `v${version}` : 'Changelog'} ${date ? `(${date})` : ''}`.trim();
      for (const [, items] of Object.entries(grouped)) {
        for (const item of items) {
          mdLines.push(item.humanized);
        }
      }
    }

    if (template === 'executive') {
      title = `Release Brief: ${version ? `v${version}` : 'Latest'}${date ? ` — ${date}` : ''}`;
      const catSummaries = [];
      for (const [catKey, items] of Object.entries(grouped)) {
        catSummaries.push({ name: catLabel[catKey] || catKey, count: items.length });
      }
      const impact = grouped.breaking
        ? `${grouped.breaking.length} breaking change(s) require attention.`
        : 'No breaking changes — safe to deploy.';
      // Store structured data for format-specific rendering
      mdLines = { overview: `This release includes ${totalChanges} changes across ${catNames.length} categories.`, categories: catSummaries, impact };
    }

    if (template === 'social') {
      title = `${version ? `v${version}` : 'New Release'} is here!`;
      const highlights = [];
      if (grouped.features) highlights.push({ emoji: '✨', text: `${grouped.features.length} new feature${grouped.features.length !== 1 ? 's' : ''}` });
      if (grouped.bugfixes) highlights.push({ emoji: '🐛', text: `${grouped.bugfixes.length} bug fix${grouped.bugfixes.length !== 1 ? 'es' : ''}` });
      if (grouped.performance) highlights.push({ emoji: '⚡', text: `${grouped.performance.length} performance improvement${grouped.performance.length !== 1 ? 's' : ''}` });
      if (grouped.breaking) highlights.push({ emoji: '⚠️', text: `${grouped.breaking.length} breaking change${grouped.breaking.length !== 1 ? 's' : ''}` });
      mdLines = { highlights, total: `${totalChanges} total changes — check it out!` };
    }

    /* ---- Render per format ---- */

    // MARKDOWN
    if (activeFormat === 'markdown') {
      if (template === 'minimalist') {
        return [`## ${title}`, ...mdLines.map(l => `- ${l}`)].join('\n');
      }
      if (template === 'executive') {
        const lines = [`# ${title}`, '', `**Overview:** ${mdLines.overview}`, ''];
        for (const c of mdLines.categories) {
          lines.push(`- **${c.name}**: ${c.count} change${c.count !== 1 ? 's' : ''}`);
        }
        lines.push('', `**Impact:** ${mdLines.impact}`);
        return lines.join('\n');
      }
      if (template === 'social') {
        const lines = [`🚀 ${title}`, ''];
        for (const h of mdLines.highlights) lines.push(`${h.emoji} ${h.text}`);
        lines.push('', mdLines.total + ' 🎉');
        return lines.join('\n');
      }
    }

    // HTML
    if (activeFormat === 'html') {
      if (template === 'minimalist') {
        const items = mdLines.map(l => `  <li>${l}</li>`).join('\n');
        return `<h2>${title}</h2>\n<ul>\n${items}\n</ul>`;
      }
      if (template === 'executive') {
        const catItems = mdLines.categories.map(c => `  <li><strong>${c.name}</strong>: ${c.count} change${c.count !== 1 ? 's' : ''}</li>`).join('\n');
        return [
          `<h1>${title}</h1>`,
          `<p><strong>Overview:</strong> ${mdLines.overview}</p>`,
          `<ul>`, catItems, `</ul>`,
          `<p><strong>Impact:</strong> ${mdLines.impact}</p>`,
        ].join('\n');
      }
      if (template === 'social') {
        const highlights = mdLines.highlights.map(h => `  <li>${h.emoji} ${h.text}</li>`).join('\n');
        return [
          `<h2>🚀 ${title}</h2>`,
          `<ul>`, highlights, `</ul>`,
          `<p>${mdLines.total} 🎉</p>`,
        ].join('\n');
      }
    }

    // SLACK
    if (activeFormat === 'slack') {
      if (template === 'minimalist') {
        const items = mdLines.map(l => `• ${l}`).join('\n');
        return `*${title}*\n\n${items}`;
      }
      if (template === 'executive') {
        const catItems = mdLines.categories.map(c => `• *${c.name}*: ${c.count} change${c.count !== 1 ? 's' : ''}`).join('\n');
        return `*${title}*\n\n${mdLines.overview}\n\n${catItems}\n\n*Impact:* ${mdLines.impact}`;
      }
      if (template === 'social') {
        const highlights = mdLines.highlights.map(h => `${h.emoji} ${h.text}`).join('\n');
        return `🚀 *${title}*\n\n${highlights}\n\n${mdLines.total} 🎉`;
      }
    }

    // JSON
    if (activeFormat === 'json') {
      if (template === 'minimalist') {
        return JSON.stringify({
          version: version || null,
          date: date || null,
          template: 'minimalist',
          changes: mdLines,
        }, null, 2);
      }
      if (template === 'executive') {
        return JSON.stringify({
          version: version || null,
          date: date || null,
          template: 'executive',
          overview: mdLines.overview,
          categories: mdLines.categories,
          impact: mdLines.impact,
        }, null, 2);
      }
      if (template === 'social') {
        return JSON.stringify({
          version: version || null,
          date: date || null,
          template: 'social',
          title,
          highlights: mdLines.highlights,
          summary: mdLines.total,
        }, null, 2);
      }
    }

    return raw;
  };

  const output = applyTemplate(getOutput());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const extensions = {
      markdown: 'md',
      html: 'html',
      slack: 'txt',
      json: 'json',
    };
    const ext = extensions[activeFormat];
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog${config.version ? `-v${config.version}` : ''}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = async () => {
    setPdfLoading(true);
    try {
      await generatePDF(grouped, config, repoInfo, stats);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setPdfLoading(false);
  };

  return (
    <div className="markdown-output" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="format-tabs">
            {Object.entries(formats).map(([key, { label, icon }]) => (
              <button
                key={key}
                className={`format-tab ${activeFormat === key ? 'active' : ''}`}
                onClick={() => setActiveFormat(key)}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="template-tabs">
            {Object.entries(templates).map(([key, { label, description }]) => (
              <button
                key={key}
                className={`template-tab ${template === key ? 'active' : ''}`}
                onClick={() => setTemplate(key)}
                title={description}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
            ⬇️ Download
          </button>
          <button
            className="btn btn-primary btn-sm pdf-btn"
            onClick={handlePdfExport}
            disabled={pdfLoading}
          >
            {pdfLoading ? '⏳ Generating...' : '📄 PDF'}
          </button>
        </div>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {output}
      </pre>
    </div>
  );
}
