// ============================================
// PDF Export — Generate styled PDF changelogs
// Uses jsPDF for programmatic PDF generation
// ============================================

import { CATEGORIES } from './changelogEngine';

/**
 * Generate a PDF changelog
 * @param {object} grouped - Grouped commits by category
 * @param {object} config - { version, date, showOriginal }
 * @param {object} repoInfo - Optional repo info
 * @param {object} stats - Commit stats
 */
export async function generatePDF(grouped, config, repoInfo, stats) {
  // Dynamically import jsPDF to keep bundle small when not used
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const colors = {
    features: [52, 211, 153],
    bugfixes: [248, 113, 113],
    performance: [251, 191, 36],
    breaking: [244, 114, 182],
    docs: [96, 165, 250],
    refactor: [192, 132, 252],
    chores: [148, 163, 184],
  };

  // Helper: check if we need a new page
  const checkPage = (needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: draw a colored rectangle
  const drawRect = (x, rectY, w, h, color, radius = 2) => {
    doc.setFillColor(...color);
    doc.roundedRect(x, rectY, w, h, radius, radius, 'F');
  };

  // ========== HEADER ==========
  // Background bar
  drawRect(0, 0, pageWidth, 40, [15, 23, 42]);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(241, 245, 249);
  const title = config.version ? `Changelog v${config.version}` : 'Changelog';
  doc.text(title, margin, 18);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  const subtitle = [
    config.date || new Date().toISOString().split('T')[0],
    repoInfo?.name ? `• ${repoInfo.name}` : '',
    stats?.total ? `• ${stats.total} commits` : '',
  ].filter(Boolean).join(' ');
  doc.text(subtitle, margin, 28);

  // Badge
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(pageWidth - margin - 35, 10, 35, 8, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('AI-Generated', pageWidth - margin - 33, 15.5);

  y = 50;

  // ========== STATS BAR ==========
  if (stats) {
    drawRect(margin, y, contentWidth, 20, [30, 41, 59]);

    const statItems = [
      { label: 'Total', value: stats.total || 0, color: [99, 102, 241] },
      { label: 'Features', value: stats.features || 0, color: colors.features },
      { label: 'Fixes', value: stats.bugfixes || 0, color: colors.bugfixes },
      { label: 'Perf', value: stats.performance || 0, color: colors.performance },
    ];

    const statWidth = contentWidth / statItems.length;
    statItems.forEach((stat, i) => {
      const sx = margin + i * statWidth;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...stat.color);
      doc.text(String(stat.value), sx + statWidth / 2, y + 9, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(stat.label, sx + statWidth / 2, y + 15, { align: 'center' });
    });

    y += 28;
  }

  // ========== CATEGORY SECTIONS ==========
  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    if (!cat) continue;
    const color = colors[catKey] || [148, 163, 184];

    checkPage(25);

    // Category header
    drawRect(margin, y, contentWidth, 10, [30, 41, 59]);
    drawRect(margin, y, 3, 10, color);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(`${cat.emoji} ${cat.title}`, margin + 6, y + 7);

    // Count badge
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`(${items.length})`, margin + 6 + doc.getTextWidth(`${cat.emoji} ${cat.title}  `), y + 7);

    y += 14;

    // Items
    for (const item of items) {
      checkPage(config.showOriginal ? 18 : 10);

      // Bullet
      doc.setFillColor(...color);
      doc.circle(margin + 3, y + 2.5, 1.2, 'F');

      // Humanized text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);

      const lines = doc.splitTextToSize(item.humanized, contentWidth - 10);
      doc.text(lines, margin + 8, y + 3.5);
      y += lines.length * 5;

      // Original commit
      if (config.showOriginal && item.raw) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const origLines = doc.splitTextToSize(`↳ ${item.raw}`, contentWidth - 12);
        doc.text(origLines, margin + 10, y + 1);
        y += origLines.length * 3.5 + 2;
      }

      y += 2;
    }

    y += 6;
  }

  // ========== FOOTER ==========
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated by Changelog Generator • Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `changelog${config.version ? `-v${config.version}` : ''}.pdf`;
  doc.save(filename);
}
