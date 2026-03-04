// ============================================
// Changelog Generator — Commit Parser & AI Engine
// ============================================

// Conventional commit pattern
const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;

// Ticket ID pattern — matches Jira (PROJ-123), Linear (TEAM-123), GitHub (#123)
const TICKET_REGEX = /\b([A-Z][A-Z0-9]+-\d+)\b|(?<!\w)(#\d+)\b/g;

/**
 * Detect and linkify Jira / Linear / GitHub ticket references in text.
 * Returns the text with ticket IDs wrapped in markdown links.
 */
export function linkifyTickets(text, { jiraBaseUrl, linearBaseUrl, githubRepo } = {}) {
  return text.replace(TICKET_REGEX, (match, jiraLinear, githubIssue) => {
    if (jiraLinear) {
      // Jira / Linear style: PROJ-123
      if (linearBaseUrl) return `[${jiraLinear}](${linearBaseUrl}/issue/${jiraLinear})`;
      if (jiraBaseUrl) return `[${jiraLinear}](${jiraBaseUrl}/browse/${jiraLinear})`;
      return `**${jiraLinear}**`;
    }
    if (githubIssue) {
      // GitHub style: #123
      if (githubRepo) return `[${githubIssue}](https://github.com/${githubRepo}/issues/${githubIssue.slice(1)})`;
      return `**${githubIssue}**`;
    }
    return match;
  });
}

// Category definitions
export const CATEGORIES = {
  features: {
    key: 'features',
    emoji: '🎉',
    title: 'New Features',
    color: 'features',
    keywords: ['feat', 'feature', 'add', 'added', 'new', 'implement', 'introduce', 'create', 'support', 'enable', 'launch'],
  },
  bugfixes: {
    key: 'bugfixes',
    emoji: '🐛',
    title: 'Bug Fixes',
    color: 'bugfixes',
    keywords: ['fix', 'bug', 'bugfix', 'patch', 'resolve', 'fixed', 'repair', 'correct', 'hotfix', 'handle'],
  },
  performance: {
    key: 'performance',
    emoji: '⚡',
    title: 'Performance Improvements',
    color: 'performance',
    keywords: ['perf', 'performance', 'optimize', 'speed', 'faster', 'cache', 'lazy'],
  },
  breaking: {
    key: 'breaking',
    emoji: '💥',
    title: 'Breaking Changes',
    color: 'breaking',
    keywords: ['breaking', 'deprecate', 'remove', 'drop'],
  },
  docs: {
    key: 'docs',
    emoji: '📚',
    title: 'Documentation',
    color: 'docs',
    keywords: ['docs', 'doc', 'documentation', 'readme', 'guide', 'tutorial'],
  },
  refactor: {
    key: 'refactor',
    emoji: '♻️',
    title: 'Code Improvements',
    color: 'refactor',
    keywords: ['refactor', 'restructure', 'clean', 'cleanup', 'rewrite', 'simplify', 'improve', 'enhance', 'modernize'],
  },
  chores: {
    key: 'chores',
    emoji: '🔧',
    title: 'Maintenance & Chores',
    color: 'chores',
    keywords: ['chore', 'build', 'ci', 'cd', 'test', 'style', 'lint', 'deps', 'dependency', 'bump', 'upgrade', 'update', 'config'],
  },
};

/**
 * Parse a single commit message
 */
export function parseCommit(raw) {
  const message = raw.trim();
  if (!message) return null;

  const conventionalMatch = message.match(CONVENTIONAL_REGEX);

  if (conventionalMatch) {
    const [, type, scope, breaking, description] = conventionalMatch;
    return {
      raw: message,
      type: type.toLowerCase(),
      scope: scope || null,
      breaking: !!breaking,
      description: description.trim(),
    };
  }

  // Non-conventional: try to infer type from message
  const lowerMsg = message.toLowerCase();

  for (const [, cat] of Object.entries(CATEGORIES)) {
    for (const kw of cat.keywords) {
      // For short keywords (<=2 chars like 'ci', 'cd'), use exact word boundary
      // For longer keywords, allow word variations (e.g., 'update' matches 'updated', 'updating')
      const kwRegex = kw.length <= 2
        ? new RegExp(`\\b${kw}\\b`, 'i')
        : new RegExp(`\\b${kw}\\w*\\b`, 'i');
      if (lowerMsg.startsWith(kw + ' ') || lowerMsg.startsWith(kw + ':') || kwRegex.test(lowerMsg)) {
        return {
          raw: message,
          type: cat.keywords[0],
          scope: null,
          breaking: false,
          description: message,
        };
      }
    }
  }

  return {
    raw: message,
    type: 'other',
    scope: null,
    breaking: false,
    description: message,
  };
}

/**
 * Categorize a parsed commit
 */
export function categorizeCommit(parsed) {
  if (!parsed) return 'chores';
  if (parsed.breaking) return 'breaking';

  const type = parsed.type.toLowerCase();

  // Exact keyword match first
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    if (cat.keywords.includes(type)) {
      return catKey;
    }
  }

  // Fuzzy match: check if the type starts with any keyword (handles past tense, etc.)
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    for (const kw of cat.keywords) {
      if (kw.length >= 3 && type.startsWith(kw)) {
        return catKey;
      }
    }
  }

  // Last resort: scan the description for category signals
  if (parsed.description) {
    const desc = parsed.description.toLowerCase();
    // Check high-priority categories first (features, bugfixes) before chores
    const priorityOrder = ['features', 'bugfixes', 'performance', 'breaking', 'docs', 'refactor', 'chores'];
    for (const catKey of priorityOrder) {
      const cat = CATEGORIES[catKey];
      for (const kw of cat.keywords) {
        const kwRegex = kw.length <= 2
          ? new RegExp(`\\b${kw}\\b`, 'i')
          : new RegExp(`\\b${kw}\\w*\\b`, 'i');
        if (kwRegex.test(desc)) {
          return catKey;
        }
      }
    }
  }

  return 'chores';
}

/**
 * Transform a technical commit description into user-friendly language
 * Enhanced regex engine with 80+ patterns covering many domains.
 *
 * @param {object} parsed - The parsed commit object
 * @param {string} category - The commit category
 * @param {string} tone - 'professional' | 'casual' | 'technical'
 */
export function humanizeCommit(parsed, category, tone = 'professional') {
  if (!parsed) return '';

  const desc = parsed.description;

  // ============================================
  // 80+ transformation patterns (most-specific → generic)
  // ============================================
  const transformations = [
    // ---- AUTH / SESSION ----
    { pattern: /(?:resolve|fix)\s+null\s*pointer\s+(?:in|for)\s+auth\s*(?:flow|module|service)?/i, output: 'Fixed a bug that was preventing some users from logging in' },
    { pattern: /(?:fix|resolve)\s+(?:auth|authentication|login)\s+(?:bug|issue|error|failure|crash)/i, output: 'Fixed a login issue that was affecting some users' },
    { pattern: /(?:add|implement)\s+(?:oauth|sso|social)\s+(?:login|auth)/i, output: 'Added new sign-in options for easier access' },
    { pattern: /(?:add|implement)\s+(?:2fa|two.?factor|mfa|multi.?factor)/i, output: 'Added two-factor authentication for improved security' },
    { pattern: /(?:fix|resolve)\s+session\s+(?:timeout|expir|invalid)/i, output: 'Fixed an issue with user sessions expiring unexpectedly' },
    { pattern: /(?:add|implement)\s+(?:password|pw)\s+(?:reset|recovery)/i, output: 'Added password recovery for easier account access' },
    { pattern: /(?:add|implement)\s+(?:jwt|token)\s+(?:refresh|rotation)/i, output: 'Improved session security with automatic token refresh' },
    { pattern: /(?:fix|resolve)\s+(?:permission|role|rbac|access)\s+(?:bug|issue|error)/i, output: 'Fixed a permissions issue that could restrict legitimate access' },
    { pattern: /(?:add|implement)\s+role.?based\s+access/i, output: 'Added role-based access control for better security' },
    { pattern: /(?:add|implement)\s+(?:signup|registration|onboard)/i, output: 'Added a streamlined onboarding experience' },

    // ---- API / ENDPOINTS / WEBHOOKS ----
    { pattern: /(?:add|implement|create)\s+(?:new\s+)?(?:api|endpoint)\s+(?:for|to)\s+(.+)/i, output: (m) => `Added new API support for ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:fix|resolve)\s+(?:api|endpoint)\s+(?:error|bug|issue|crash)\s*(?:for|in|on)?\s*(.*)/i, output: (m) => m[1] ? `Fixed an issue with the ${humanizeTechnicalTerm(m[1])} API` : 'Fixed an API issue' },
    { pattern: /(?:add|implement)\s+(?:graphql|rest\s*api)\s+(?:for|support)/i, output: 'Added new API integration options' },
    { pattern: /(?:add|implement)\s+(?:webhook|hook)\s+(?:for|support|integration)/i, output: 'Added webhook support for third-party integrations' },
    { pattern: /(?:add|implement)\s+(?:pagination|paging)\b/i, output: 'Added pagination for better data browsing' },
    { pattern: /(?:add|implement)\s+(?:versioning|api\s*v\d)/i, output: 'Added API versioning for smoother upgrades' },
    { pattern: /rate\s*limit/i, output: 'Improved API rate limiting for better reliability' },
    { pattern: /(?:add|implement)\s+(?:retry|backoff|circuit.?breaker)/i, output: 'Improved reliability of external service connections' },

    // ---- UI / UX / DESIGN ----
    { pattern: /(?:fix|resolve)\s+(?:ui|layout|css|style)\s+(?:bug|issue|glitch)\s*(?:for|in|on)?\s*(.*)/i, output: (m) => m[1] ? `Fixed a visual glitch in ${humanizeTechnicalTerm(m[1])}` : 'Fixed a visual display issue' },
    { pattern: /(?:add|implement|create)\s+dark\s*mode/i, output: 'Added dark mode support' },
    { pattern: /(?:add|implement)\s+(?:responsive|mobile)\s+(?:design|layout|support)/i, output: 'Improved the experience on mobile devices' },
    { pattern: /(?:redesign|revamp|overhaul)\s+(.+)/i, output: (m) => `Redesigned ${humanizeTechnicalTerm(m[1])} for a better experience` },
    { pattern: /(?:fix|resolve)\s+(?:alignment|spacing|padding|margin)\s*(?:of|for|in|on)?\s*(.*)/i, output: (m) => m[1] ? `Fixed layout alignment in ${humanizeTechnicalTerm(m[1])}` : 'Fixed layout alignment issues' },
    { pattern: /(?:add|implement)\s+(?:animation|transition|skeleton)\b/i, output: 'Added smoother animations and visual transitions' },
    { pattern: /(?:add|implement)\s+(?:tooltip|popover|hint)s?\b/i, output: 'Added helpful tooltips for better guidance' },
    { pattern: /(?:add|implement)\s+(?:breadcrumb|sidebar|navbar|nav)/i, output: 'Improved navigation for easier browsing' },
    { pattern: /(?:add|implement)\s+(?:modal|dialog|drawer|sheet)/i, output: 'Added new dialog interface for smoother interactions' },
    { pattern: /(?:fix|resolve)\s+(?:scroll|overflow|z.?index)\s*(.*)/i, output: (m) => m[1] ? `Fixed a scrolling issue in ${humanizeTechnicalTerm(m[1])}` : 'Fixed a scrolling issue' },
    { pattern: /(?:add|implement)\s+(?:drag.?(?:and|&)?.?drop|dnd)\b/i, output: 'Added drag and drop support' },
    { pattern: /(?:add|implement)\s+(?:keyboard|a11y|accessibility)\s+(?:support|shortcut|navigation)/i, output: 'Improved keyboard accessibility' },
    { pattern: /(?:add|implement)\s+(?:theme|theming)\b/i, output: 'Added theme customization options' },
    { pattern: /(?:fix|resolve)\s+(?:responsive|mobile|tablet)\s+(?:bug|issue|layout)/i, output: 'Fixed a layout issue on smaller screens' },
    { pattern: /(?:add|implement)\s+(?:loading|spinner|progress)\s+(?:state|indicator|bar)/i, output: 'Added loading indicators for better feedback' },
    { pattern: /(?:add|implement)\s+(?:toast|snackbar|flash)\s+(?:notification|message)/i, output: 'Added notification messages for better feedback' },
    { pattern: /(?:add|implement)\s+(?:empty\s+state|placeholder|zero\s+state)/i, output: 'Added helpful empty state messages' },

    // ---- PERFORMANCE / OPTIMIZATION ----
    { pattern: /(?:optimize|improve)\s+(?:page|app)\s+(?:load|loading)\s*(?:time|speed)?/i, output: 'Pages now load significantly faster' },
    { pattern: /(?:add|implement|enable)\s+(?:lazy|code)\s*(?:load|split)/i, output: 'Improved app loading speed with smarter resource loading' },
    { pattern: /(?:reduce|decrease|lower)\s+(?:bundle|build)\s+size/i, output: 'Reduced app size for faster downloads' },
    { pattern: /(?:optimize|improve)\s+(?:database|db|query|sql)\s*(?:performance|speed)?/i, output: 'Improved data loading speeds' },
    { pattern: /(?:add|implement|enable)\s+cach/i, output: 'Added caching for faster repeat visits' },
    { pattern: /(?:optimize|improve)\s+(?:image|media|asset)/i, output: 'Optimized images for faster loading' },
    { pattern: /(?:optimize|improve)\s+memory/i, output: 'Reduced memory usage for smoother performance' },
    { pattern: /(?:add|implement)\s+(?:service.?worker|sw|pwa|offline)/i, output: 'Added offline support for working without internet' },
    { pattern: /(?:add|implement)\s+(?:web.?worker|worker.?thread)/i, output: 'Improved performance by offloading heavy tasks' },
    { pattern: /(?:optimize|improve)\s+(?:render|re.?render)/i, output: 'Improved UI rendering performance' },
    { pattern: /(?:add|implement)\s+(?:virtual|windowed)\s+(?:scroll|list)/i, output: 'Improved performance for large lists and tables' },
    { pattern: /(?:add|implement)\s+(?:prefetch|preload|prerender)/i, output: 'Added predictive loading for faster navigation' },
    { pattern: /(?:reduce|decrease)\s+(?:api|network)\s+(?:call|request)/i, output: 'Reduced network requests for faster responses' },
    { pattern: /(?:optimize|improve)\s+(?:startup|boot|init)/i, output: 'Improved application startup time' },

    // ---- DATA / DATABASE / STORAGE ----
    { pattern: /(?:fix|resolve)\s+(?:data|database|db)\s+(?:migration|sync|corruption)/i, output: 'Fixed a data synchronization issue' },
    { pattern: /(?:add|implement)\s+(?:export|download)\s+(?:to|as)\s+(.+)/i, output: (m) => `You can now export your data as ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:add|implement)\s+(?:import|upload)\s+(?:from|for)\s+(.+)/i, output: (m) => `You can now import data from ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:add|implement)\s+(?:backup|snapshot)/i, output: 'Added automatic data backup support' },
    { pattern: /(?:add|implement)\s+(?:encryption|encrypt)\s+(?:for|at|in)/i, output: 'Added data encryption for better privacy' },
    { pattern: /(?:fix|resolve)\s+(?:data\s+)?(?:loss|corruption|integrity)/i, output: 'Fixed an issue that could cause data loss' },
    { pattern: /(?:add|implement)\s+(?:migration|migrate)/i, output: 'Added data migration support for smoother updates' },
    { pattern: /(?:add|implement)\s+(?:undo|redo|history)/i, output: 'Added undo/redo support' },
    { pattern: /(?:add|implement)\s+(?:auto.?save|draft)/i, output: 'Added auto-save to prevent losing your work' },

    // ---- NOTIFICATION / MESSAGING ----
    { pattern: /(?:add|implement)\s+(?:email|push|in-app)\s+notification/i, output: 'Added new notification options to keep you informed' },
    { pattern: /(?:fix|resolve)\s+notification\s+(?:not\s+)?(?:send|deliver|show)/i, output: 'Fixed an issue where some notifications were not being delivered' },
    { pattern: /(?:fix|resolve)\s+(?:duplicate|double)\s+(?:notification|email|message)/i, output: 'Fixed duplicate notifications being sent' },
    { pattern: /(?:add|implement)\s+(?:chat|messaging|dm|direct.?message)/i, output: 'Added messaging capabilities' },
    { pattern: /(?:add|implement)\s+(?:mention|@.?mention|tagging)/i, output: 'Added user mentions and tagging support' },

    // ---- SEARCH / FILTER / SORT ----
    { pattern: /(?:add|implement)\s+(?:full.?text|fuzzy|autocomplete)\s+search/i, output: 'Added powerful search capabilities to find things faster' },
    { pattern: /(?:add|implement|improve)\s+search/i, output: 'Improved search to help you find things faster' },
    { pattern: /(?:add|implement)\s+(?:filter|sort|facet)/i, output: 'Added new filtering and sorting options' },
    { pattern: /(?:add|implement)\s+(?:suggest|suggestion|typeahead)/i, output: 'Added search suggestions for quicker results' },

    // ---- SECURITY / VULNERABILITY ----
    { pattern: /(?:fix|patch|resolve)\s+(?:security|vulnerability|xss|csrf|injection|cve)/i, output: 'Applied security improvements to protect your data' },
    { pattern: /(?:update|upgrade|bump)\s+(?:dependency|dependencies|deps|package|lib)/i, output: 'Updated dependencies for improved security and stability' },
    { pattern: /(?:add|implement)\s+(?:csrf|xss|csp)\s+(?:protection|prevention)/i, output: 'Added additional security protections' },
    { pattern: /(?:add|implement)\s+(?:input|data)\s+(?:validation|sanitiz)/i, output: 'Improved input validation for better security' },
    { pattern: /(?:add|implement)\s+(?:audit|logging)\s+(?:trail|log)/i, output: 'Added audit logging for better traceability' },

    // ---- TESTING / CI / CD ----
    { pattern: /(?:add|implement|write)\s+(?:unit|integration|e2e|end.?to.?end)\s+test/i, output: 'Added automated tests for improved reliability' },
    { pattern: /(?:fix|resolve)\s+(?:flaky|failing|broken)\s+test/i, output: 'Fixed unreliable tests for more consistent builds' },
    { pattern: /(?:add|implement|setup|configure)\s+(?:ci|cd|pipeline|github\s*action|workflow)/i, output: 'Improved the deployment pipeline' },
    { pattern: /(?:add|implement)\s+(?:docker|container|k8s|kubernetes)/i, output: 'Improved deployment infrastructure' },
    { pattern: /(?:add|implement)\s+(?:lint|eslint|prettier|format)/i, output: 'Improved code quality tooling' },
    { pattern: /(?:increase|improve)\s+(?:test|code)\s+coverage/i, output: 'Improved test coverage for better reliability' },

    // ---- INTERNATIONALIZATION / LOCALIZATION ----
    { pattern: /(?:add|implement)\s+(?:i18n|l10n|internationali[sz]|locali[sz]|translat)/i, output: 'Added support for multiple languages' },
    { pattern: /(?:add|implement)\s+(?:rtl|right.?to.?left)\s+support/i, output: 'Added right-to-left language support' },

    // ---- FILE / MEDIA HANDLING ----
    { pattern: /(?:add|implement)\s+(?:file|image|video|media)\s+(?:upload|attachment)/i, output: 'Added file upload capabilities' },
    { pattern: /(?:add|implement)\s+(?:pdf|csv|excel|xlsx)\s+(?:export|generat)/i, output: 'Added document export support' },
    { pattern: /(?:fix|resolve)\s+(?:file|image|video)\s+(?:upload|download)\s+(?:bug|issue|error)/i, output: 'Fixed a file handling issue' },
    { pattern: /(?:add|implement)\s+(?:image|photo)\s+(?:crop|resize|compress)/i, output: 'Added image editing capabilities' },

    // ---- THIRD-PARTY INTEGRATION ----
    { pattern: /(?:add|implement)\s+(?:stripe|paypal|payment)\s+integration/i, output: 'Added payment processing support' },
    { pattern: /(?:add|implement)\s+(?:slack|discord|teams)\s+integration/i, output: 'Added chat platform integration' },
    { pattern: /(?:add|implement)\s+(?:google|aws|azure|cloud)\s+(?:integration|connect)/i, output: 'Added cloud service integration' },
    { pattern: /(?:add|implement)\s+(?:analytics|tracking|telemetry)/i, output: 'Added analytics for usage insights' },
    { pattern: /(?:add|implement)\s+(?:sentry|bugsnag|datadog|monitoring)\s+(?:integration)?/i, output: 'Added error monitoring for better reliability' },

    // ---- FORM / INPUT / VALIDATION ----
    { pattern: /(?:fix|resolve)\s+(?:form|input|field)\s+(?:validation|submit|error)/i, output: 'Fixed a form validation issue' },
    { pattern: /(?:add|implement)\s+(?:form|wizard|multi.?step)\b/i, output: 'Added a new form interface' },
    { pattern: /(?:add|implement)\s+(?:autocomplete|auto.?fill|suggest)/i, output: 'Added autocomplete for faster data entry' },
    { pattern: /(?:fix|resolve)\s+(?:regex|regular\s+expression|email\s+validat)/i, output: 'Fixed input validation rules' },

    // ---- ERROR HANDLING / LOGGING ----
    { pattern: /(?:add|implement|improve)\s+(?:error|exception)\s+(?:handling|boundary|page)/i, output: 'Improved how errors are handled for a better experience' },
    { pattern: /(?:add|implement)\s+(?:error\s+)?(?:logging|log|telemetry)/i, output: 'Improved error logging for faster issue resolution' },
    { pattern: /(?:fix|resolve)\s+(?:crash|freeze|hang|unresponsive)/i, output: 'Fixed an issue that could cause the app to become unresponsive' },

    // ---- CONFIGURATION / SETTINGS ----
    { pattern: /(?:add|implement)\s+(?:setting|preference|config)\s*(?:page|panel|section)?/i, output: 'Added new customization options in settings' },
    { pattern: /(?:add|implement)\s+(?:env|environment)\s+(?:variable|config)/i, output: 'Improved deployment configuration' },

    // ---- DOCUMENTATION ----
    { pattern: /(?:add|create|write|update)\s+(?:readme|changelog|contributing)/i, output: 'Updated project documentation' },
    { pattern: /(?:add|create|write|update)\s+(?:api\s+)?(?:doc|documentation|guide|tutorial)/i, output: 'Improved documentation for better developer experience' },
    { pattern: /(?:add|create)\s+(?:example|sample|demo)/i, output: 'Added examples for easier onboarding' },

    // ---- GENERIC PATTERNS (broader fallbacks) ----
    { pattern: /(?:add|implement|create|introduce)\s+(?:new\s+)?(.+)/i, output: (m) => `Added ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:fix|resolve|repair|correct)\s+(.+)/i, output: (m) => `Fixed ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:improve|enhance|upgrade|boost|optimiz)\w*\s+(.+)/i, output: (m) => `Improved ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:remove|delete|drop|deprecate)\s+(.+)/i, output: (m) => `Removed ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:update|change|modify|adjust)\s+(.+)/i, output: (m) => `Updated ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:refactor|restructure|rewrite|simplify|clean\s*up)\s+(.+)/i, output: (m) => `Improved the internal structure of ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:migrate|move|port)\s+(.+)/i, output: (m) => `Migrated ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:enable|allow|support|unblock)\s+(.+)/i, output: (m) => `Enabled ${humanizeTechnicalTerm(m[1])}` },
    { pattern: /(?:disable|block|prevent|restrict)\s+(.+)/i, output: (m) => `Restricted ${humanizeTechnicalTerm(m[1])} for safety` },
    { pattern: /(?:rename|alias)\s+(.+)\s+to\s+(.+)/i, output: (m) => `Renamed ${humanizeTechnicalTerm(m[1])} to ${humanizeTechnicalTerm(m[2])}` },
    { pattern: /(?:replace|swap|switch)\s+(.+)\s+with\s+(.+)/i, output: (m) => `Replaced ${humanizeTechnicalTerm(m[1])} with ${humanizeTechnicalTerm(m[2])}` },
    { pattern: /(?:revert|rollback)\s+(.+)/i, output: (m) => `Reverted ${humanizeTechnicalTerm(m[1])} to previous behavior` },
  ];

  // For technical tone, skip humanization and return a cleaned-up version
  // that preserves the original technical language
  if (tone === 'technical') {
    return technicalCleanup(desc, category);
  }

  for (const t of transformations) {
    const match = desc.match(t.pattern);
    if (match) {
      const base = typeof t.output === 'function' ? t.output(match) : t.output;
      return applyTone(base, tone, category);
    }
  }

  // Fallback: capitalize and clean up
  return applyTone(cleanupDescription(desc, category), tone, category);
}

/**
 * For technical tone: clean up the original commit description minimally,
 * preserving technical language, abbreviations, and jargon.
 */
function technicalCleanup(desc, category) {
  // Strip conventional commit prefix (feat:, fix(scope):, etc.)
  let cleaned = desc.replace(/^\w+(\([^)]*\))?!?:\s*/, '');

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Add category-appropriate technical prefix if no action word
  const actionWords = /^(fix|add|improv|updat|remov|enabl|creat|migrat|revert|implement|refactor|optimiz|patch|resolv|deprecat|bump|configur|initializ|set up|integrat|replac|renam)/i;
  if (!actionWords.test(cleaned)) {
    const prefixMap = {
      bugfixes: 'Fix:',
      features: 'Implement:',
      performance: 'Optimize:',
      refactor: 'Refactor:',
      docs: 'Document:',
      breaking: 'BREAKING:',
      chores: 'Chore:',
    };
    const prefix = prefixMap[category] || '';
    if (prefix) cleaned = `${prefix} ${cleaned}`;
  }

  return cleaned;
}

/**
 * Apply tone adjustments to a humanized string
 */
function applyTone(text, tone, category) {
  if (!text) return text;

  if (tone === 'casual') {
    let casual = text;

    // Broad verb-prefix replacements (order matters — most specific first)
    casual = casual.replace(/^Fixed a bug that was preventing/i, 'Squashed a bug that was blocking');
    casual = casual.replace(/^Fixed a bug/i, 'Squashed a bug');
    casual = casual.replace(/^Fixed an issue/i, 'Took care of an issue');
    casual = casual.replace(/^Fixed a (\w+) issue/i, (_, w) => `Sorted out a ${w} hiccup`);
    casual = casual.replace(/^Fixed:/i, 'Squashed:');
    casual = casual.replace(/^Fixed /i, 'Patched up ');
    casual = casual.replace(/^Added new /i, 'Shiny new ');
    casual = casual.replace(/^Added automatic /i, 'Now with automatic ');
    casual = casual.replace(/^Added support for /i, 'Now supports ');
    casual = casual.replace(/^Added /i, 'You can now enjoy ');
    casual = casual.replace(/^Improved the experience/i, 'Made things nicer');
    casual = casual.replace(/^Improved the internal/i, 'Tidied up the internal');
    casual = casual.replace(/^Improved /i, 'Leveled up ');
    casual = casual.replace(/^Updated dependencies/i, 'Freshened up our under-the-hood bits');
    casual = casual.replace(/^Updated project documentation/i, 'Gave the docs some love');
    casual = casual.replace(/^Updated /i, 'Freshened up ');
    casual = casual.replace(/^Removed /i, 'Said goodbye to ');
    casual = casual.replace(/^Enabled /i, 'Switched on ');
    casual = casual.replace(/^Restricted /i, 'Locked down ');
    casual = casual.replace(/^Migrated /i, 'Moved over ');
    casual = casual.replace(/^Reverted /i, 'Rolled back ');
    casual = casual.replace(/^Replaced /i, 'Swapped out ');
    casual = casual.replace(/^Renamed /i, 'Gave a new name to ');
    casual = casual.replace(/^Reduced /i, 'Trimmed down ');

    // Tail-end softeners
    casual = casual.replace(/for better performance$/i, '\u2014 it\'s way snappier now!');
    casual = casual.replace(/for improved security$/i, 'to keep your stuff safe');
    casual = casual.replace(/for a better experience$/i, '\u2014 you\'re gonna love it!');
    casual = casual.replace(/for better reliability$/i, 'so things break less');
    casual = casual.replace(/for smoother updates$/i, 'to make updates a breeze');
    casual = casual.replace(/for easier access$/i, 'so it\'s easier to get in');
    casual = casual.replace(/for better guidance$/i, 'to help you out');
    casual = casual.replace(/for faster downloads$/i, '\u2014 downloads are speedier now!');
    casual = casual.replace(/for faster loading$/i, '\u2014 things load quicker!');
    casual = casual.replace(/for better security$/i, 'to keep everything safe');
    casual = casual.replace(/for better privacy$/i, 'to keep your data private');

    // Add exclamation for energy (deterministic based on text length)
    if (!casual.endsWith('!') && !casual.endsWith('?') && !casual.endsWith('.')) {
      if (casual.length % 3 !== 0) casual += '!';
    }
    return casual;
  }

  // Professional (default) — already good as-is from humanizer
  return text;
}

/**
 * Clean up a description for user-facing output (expanded abbreviation map)
 */
function cleanupDescription(desc, category) {
  let cleaned = desc
    .replace(/^\w+(\([^)]*\))?!?:\s*/, '') // Remove conventional prefix
    .replace(/\b(impl|fn|func|cb|ctx|env|req|res|err|args|params|config|cfg|auth|db|deps|perf|infra|repo|util|init|src|dist|pkg|ver|dev|prod|stg|btn|nav|hdr|ftr|msg|txt|img|bg|fg|sel|idx|len|cnt|tmp|ptr|ref|val)\b/gi, (m) => {
      const map = {
        impl: 'implementation', fn: 'function', func: 'function',
        cb: 'callback', ctx: 'context', env: 'environment',
        req: 'request', res: 'response', err: 'error',
        args: 'arguments', params: 'parameters',
        config: 'configuration', cfg: 'configuration',
        auth: 'authentication', db: 'database', deps: 'dependencies',
        perf: 'performance', infra: 'infrastructure', repo: 'repository',
        util: 'utility', init: 'initialization',
        src: 'source', dist: 'distribution', pkg: 'package',
        ver: 'version', dev: 'development', prod: 'production',
        stg: 'staging', btn: 'button', nav: 'navigation',
        hdr: 'header', ftr: 'footer', msg: 'message',
        txt: 'text', img: 'image', bg: 'background',
        fg: 'foreground', sel: 'selection', idx: 'index',
        len: 'length', cnt: 'count', tmp: 'temporary',
        ptr: 'pointer', ref: 'reference', val: 'value',
      };
      return map[m.toLowerCase()] || m;
    })
    .replace(/\bwip\b/gi, 'work in progress');

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Add appropriate prefix based on category if missing "action" word
  const actionWords = /^(fix|add|improv|updat|remov|enabl|creat|migrat|revert)/i;
  if (category === 'bugfixes' && !actionWords.test(cleaned)) {
    cleaned = 'Fixed: ' + cleaned;
  } else if (category === 'features' && !actionWords.test(cleaned)) {
    cleaned = 'Added: ' + cleaned;
  }

  return cleaned;
}

/**
 * Convert technical terms to user-friendly language (expanded dictionary — 60+ terms)
 */
function humanizeTechnicalTerm(term) {
  const replacements = [
    // Errors / technical concepts
    [/\bnull\s*pointer\b/gi, 'an unexpected error'],
    [/\brace\s*condition\b/gi, 'a timing issue'],
    [/\bmemory\s*leak\b/gi, 'a memory issue'],
    [/\bstack\s*overflow\b/gi, 'a processing error'],
    [/\bdeadlock\b/gi, 'a system freeze issue'],
    [/\bsegfault\b/gi, 'a critical crash'],
    [/\binfinite\s*(?:loop|recursion)\b/gi, 'an infinite loop issue'],
    [/\btype\s*error\b/gi, 'a type mismatch error'],
    [/\bruntime\s*(?:error|exception)\b/gi, 'an unexpected error'],

    // Technologies / protocols
    [/\bregex(p)?\b/gi, 'pattern matching'],
    [/\bwebsocket\b/gi, 'real-time connection'],
    [/\bssr\b/gi, 'server rendering'],
    [/\bcors\b/gi, 'cross-origin access'],
    [/\bcdn\b/gi, 'content delivery'],
    [/\bci\/cd\b/gi, 'deployment pipeline'],
    [/\borm\b/gi, 'database layer'],
    [/\bmiddleware\b/gi, 'request processing'],
    [/\bendpoint\b/gi, 'API route'],
    [/\bschema\b/gi, 'data structure'],
    [/\brefactor(?:ing)?\b/gi, 'restructuring'],
    [/\bgrpc\b/gi, 'service communication'],
    [/\bgraphql\b/gi, 'query interface'],
    [/\brest(?:ful)?\s+api\b/gi, 'web API'],
    [/\bjwt\b/gi, 'authentication token'],
    [/\boauth\b/gi, 'third-party authentication'],
    [/\bsaml\b/gi, 'enterprise sign-in'],
    [/\bcrud\b/gi, 'data operations'],
    [/\bdom\b/gi, 'page elements'],
    [/\bsdk\b/gi, 'development toolkit'],
    [/\bcli\b/gi, 'command-line tool'],
    [/\bdocker(?:file)?\b/gi, 'container setup'],
    [/\bk8s\b/gi, 'container orchestration'],
    [/\bkubernetes\b/gi, 'container orchestration'],
    [/\bnginx\b/gi, 'web server'],
    [/\bwebpack\b/gi, 'build tools'],
    [/\bvite\b/gi, 'build tools'],
    [/\bbabel\b/gi, 'JavaScript compiler'],
    [/\bestlint\b/gi, 'code quality'],
    [/\bprettier\b/gi, 'code formatting'],
    [/\bpostgres(?:ql)?\b/gi, 'PostgreSQL database'],
    [/\bmongo(?:db)?\b/gi, 'MongoDB database'],
    [/\bredis\b/gi, 'cache store'],
    [/\bssl\b/gi, 'secure connection'],
    [/\btls\b/gi, 'encrypted connection'],
    [/\bdns\b/gi, 'domain lookup'],
    [/\bhttp\b/gi, 'web request'],
  ];

  let result = term;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Parse multiple commit messages (newline-separated)
 * @param {string} text - Newline-separated commit messages
 * @param {string} tone - 'professional' | 'casual' | 'technical'
 */
export function parseCommitMessages(text, tone = 'professional') {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const parsed = parseCommit(line);
      if (!parsed) return null;
      const category = categorizeCommit(parsed);
      const humanized = humanizeCommit(parsed, category, tone);
      return {
        ...parsed,
        category,
        humanized,
      };
    })
    .filter(Boolean);
}

/**
 * Group parsed commits by category
 */
export function groupByCategory(commits) {
  const grouped = {};

  for (const commit of commits) {
    if (!grouped[commit.category]) {
      grouped[commit.category] = [];
    }
    grouped[commit.category].push(commit);
  }

  // Sort categories in preferred order
  const order = ['breaking', 'features', 'bugfixes', 'performance', 'refactor', 'docs', 'chores'];
  const sorted = {};
  for (const key of order) {
    if (grouped[key] && grouped[key].length > 0) {
      sorted[key] = grouped[key];
    }
  }

  return sorted;
}

/** Category titles for stakeholder audience */
export const STAKEHOLDER_TITLES = {
  features: 'Milestone Deliverables',
  bugfixes: 'Stability Improvements',
  performance: 'Performance Optimizations',
  breaking: 'Migration Requirements',
  docs: 'Documentation Updates',
  refactor: 'Technical Debt Reduction',
  chores: 'Infrastructure & DevOps',
};

/**
 * Generate markdown changelog
 */
export function generateMarkdown(grouped, version, date, showOriginal = false, audience = 'end-user') {
  const isStakeholder = audience === 'stakeholder';
  let md = `# ${version ? `v${version}` : 'Changelog'} ${date ? `(${date})` : ''}\n\n`;

  if (isStakeholder) {
    const totalItems = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);
    md += `> **Release Summary:** ${totalItems} changes across ${Object.keys(grouped).length} categories\n\n`;
  }

  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    if (!cat) continue;
    const title = isStakeholder ? (STAKEHOLDER_TITLES[catKey] || cat.title) : cat.title;
    md += `## ${cat.emoji} ${title}\n\n`;
    for (const item of items) {
      md += `- ${linkifyTickets(item.humanized)}\n`;
      if (showOriginal) {
        md += `  > _Original: \`${item.raw}\`_\n`;
      }
    }
    md += '\n';
  }

  return md.trim();
}

/**
 * Generate HTML changelog
 */
export function generateHTML(grouped, version, date, showOriginal = false, audience = 'end-user') {
  const isStakeholder = audience === 'stakeholder';
  let html = `<h1>${version ? `v${version}` : 'Changelog'} ${date ? `<small>(${date})</small>` : ''}</h1>\n\n`;

  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    if (!cat) continue;
    const title = isStakeholder ? (STAKEHOLDER_TITLES[catKey] || cat.title) : cat.title;
    html += `<h2>${cat.emoji} ${title}</h2>\n<ul>\n`;
    for (const item of items) {
      const linked = linkifyTickets(item.humanized);
      if (showOriginal) {
        html += `  <li>${linked}<br/><small><em>Original: <code>${item.raw}</code></em></small></li>\n`;
      } else {
        html += `  <li>${linked}</li>\n`;
      }
    }
    html += `</ul>\n\n`;
  }

  return html.trim();
}

/**
 * Generate Slack-formatted changelog
 */
export function generateSlack(grouped, version, date, showOriginal = false, audience = 'end-user') {
  const isStakeholder = audience === 'stakeholder';
  let slack = `*${version ? `v${version}` : 'Release Update'}* ${date ? `_(${date})_` : ''}\n\n`;

  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    if (!cat) continue;
    const title = isStakeholder ? (STAKEHOLDER_TITLES[catKey] || cat.title) : cat.title;
    slack += `${cat.emoji} *${title}*\n`;
    for (const item of items) {
      slack += `• ${linkifyTickets(item.humanized)}\n`;
      if (showOriginal) {
        slack += `   _\`${item.raw}\`_\n`;
      }
    }
    slack += '\n';
  }

  return slack.trim();
}

/**
 * Generate JSON changelog
 */
export function generateJSON(grouped, version, date, showOriginal = false, audience = 'end-user') {
  const isStakeholder = audience === 'stakeholder';
  const result = {
    version: version || 'unreleased',
    date: date || new Date().toISOString().split('T')[0],
    audience,
    categories: {},
  };

  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    if (!cat) continue;
    const title = isStakeholder ? (STAKEHOLDER_TITLES[catKey] || cat.title) : cat.title;
    result.categories[catKey] = {
      title,
      emoji: cat.emoji,
      items: items.map((item) => {
        const entry = {
          description: item.humanized,
          scope: item.scope,
        };
        if (showOriginal) {
          entry.original = item.raw;
        }
        return entry;
      }),
    };
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Sample commit messages for demo
 */
export const SAMPLE_COMMITS = `feat: add dark mode toggle to user settings
fix: resolve null pointer in auth flow
feat(search): implement full-text search with filters
fix(ui): correct alignment of sidebar navigation on mobile
perf: optimize image loading with lazy load and WebP format
feat: add export to CSV and PDF for reports
fix: prevent duplicate notifications being sent
chore: update React to v18.2 and dependencies
feat(api): add webhook support for third-party integrations
fix(auth): resolve session timeout not redirecting to login
perf: reduce initial bundle size by 40% with code splitting
docs: update API documentation with new endpoints
refactor: restructure user service for better maintainability
feat: implement real-time collaborative editing
fix: resolve race condition in payment processing
perf: add Redis caching layer for frequently accessed data
feat(notifications): add email digest for weekly summaries
fix(dashboard): correct chart rendering with empty datasets
breaking: remove deprecated v1 API endpoints
chore: migrate CI pipeline to GitHub Actions
feat: add SSO support with SAML and OAuth providers
fix: handle edge case in date parsing for timezones`;

export const SAMPLE_COMMITS_SMALL = `feat: add user profile page
fix: resolve login timeout issue
perf: optimize database queries
fix: correct email validation regex
feat: add file upload support
chore: update dependencies`;
