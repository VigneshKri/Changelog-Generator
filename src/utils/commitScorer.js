// ============================================
// Commit Quality Scorer
// Analyzes commit message quality and provides recommendations
// ============================================

/**
 * Score a single commit message
 * Returns a score from 0-100 and a list of issues/suggestions
 */
export function scoreCommit(raw) {
  const message = raw.trim();
  let score = 100;
  const issues = [];
  const suggestions = [];

  // 1. Empty or very short message
  if (message.length < 5) {
    score -= 40;
    issues.push('Message is too short');
  } else if (message.length < 15) {
    score -= 15;
    suggestions.push('Consider adding more detail');
  }

  // 2. Too long (first line)
  const firstLine = message.split('\n')[0];
  if (firstLine.length > 72) {
    score -= 10;
    suggestions.push('First line should be under 72 characters');
  }

  // 3. Conventional commit format
  const conventionalRegex = /^(\w+)(\([^)]*\))?!?:\s+.+/;
  const isConventional = conventionalRegex.test(message);
  if (isConventional) {
    // Bonus for conventional commits
    score = Math.min(100, score + 5);
  } else {
    score -= 15;
    suggestions.push('Use conventional commit format (e.g., feat: add login)');
  }

  // 4. Has a scope (only suggest if already using conventional format)
  const scopeRegex = /^\w+\([^)]+\)/;
  if (scopeRegex.test(message)) {
    score = Math.min(100, score + 5);
  } else if (isConventional) {
    suggestions.push('Add a scope for better context (e.g., fix(auth): ...)');
  }

  // 5. Starts with lowercase after type prefix (good practice)
  const descMatch = message.match(/^\w+(\([^)]*\))?!?:\s*(.)/);
  if (descMatch && descMatch[2] && descMatch[2] === descMatch[2].toUpperCase() && descMatch[2] !== descMatch[2].toLowerCase()) {
    score -= 5;
    suggestions.push('Description should start with lowercase');
  }

  // 6. Imperative mood check (common non-imperative patterns)
  const nonImperative = /:\s*(added|fixed|removed|updated|changed|implemented|created|deleted|modified|resolved|improved)/i;
  if (nonImperative.test(message)) {
    score -= 10;
    suggestions.push('Use imperative mood (e.g., "add" not "added")');
  }

  // 7. Contains vague words
  const vagueWords = /\b(stuff|things|misc|various|some|minor|small|change|update)\b/i;
  if (vagueWords.test(message) && message.length < 30) {
    score -= 10;
    issues.push('Message is too vague');
  }

  // 8. WIP or TODO commits
  if (/\b(wip|todo|fixme|hack|temp|tmp)\b/i.test(message)) {
    score -= 20;
    issues.push('Contains WIP/TODO markers — should not be in release');
  }

  // 9. Has meaningful words (not just type prefix)
  const descOnly = message.replace(/^\w+(\([^)]*\))?!?:\s*/, '');
  const wordCount = descOnly.split(/\s+/).filter(w => w.length > 1).length;
  if (wordCount < 2) {
    score -= 15;
    suggestions.push('Add more descriptive words');
  }

  // 10. No trailing period (conventional commit style)
  if (message.endsWith('.')) {
    score -= 5;
    suggestions.push('Remove trailing period for consistency');
  }

  // 11. All caps = shouting
  if (message === message.toUpperCase() && message.length > 5) {
    score -= 10;
    issues.push('Avoid ALL CAPS in commit messages');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    raw: message,
    score,
    grade: getGrade(score),
    issues,
    suggestions,
  };
}

/**
 * Score an array of commit messages
 */
export function scoreAllCommits(commits) {
  const scored = commits.map((c) => scoreCommit(typeof c === 'string' ? c : c.raw));

  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
  const avgScore = scored.length > 0 ? Math.round(totalScore / scored.length) : 0;

  // Distribution
  const excellent = scored.filter((s) => s.score >= 90).length;
  const good = scored.filter((s) => s.score >= 70 && s.score < 90).length;
  const needsWork = scored.filter((s) => s.score >= 50 && s.score < 70).length;
  const poor = scored.filter((s) => s.score < 50).length;

  // Common issues
  const allIssues = scored.flatMap((s) => s.issues);
  const allSuggestions = scored.flatMap((s) => s.suggestions);
  const issueFrequency = countFrequency(allIssues);
  const suggestionFrequency = countFrequency(allSuggestions);

  // Conventional commit adoption
  const conventional = scored.filter((s) =>
    /^\w+(\([^)]*\))?!?:\s+/.test(s.raw)
  ).length;
  const conventionalPercent = scored.length > 0
    ? Math.round((conventional / scored.length) * 100)
    : 0;

  return {
    scores: scored,
    average: avgScore,
    grade: getGrade(avgScore),
    distribution: { excellent, good, needsWork, poor },
    total: scored.length,
    conventionalPercent,
    topIssues: issueFrequency.slice(0, 5),
    topSuggestions: suggestionFrequency.slice(0, 5),
  };
}

function getGrade(score) {
  if (score >= 90) return { letter: 'A', color: '#34d399', label: 'Excellent' };
  if (score >= 80) return { letter: 'B', color: '#60a5fa', label: 'Good' };
  if (score >= 70) return { letter: 'C', color: '#fbbf24', label: 'Fair' };
  if (score >= 50) return { letter: 'D', color: '#fb923c', label: 'Needs Work' };
  return { letter: 'F', color: '#f87171', label: 'Poor' };
}

function countFrequency(arr) {
  const freq = {};
  for (const item of arr) {
    freq[item] = (freq[item] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([text, count]) => ({ text, count }));
}
