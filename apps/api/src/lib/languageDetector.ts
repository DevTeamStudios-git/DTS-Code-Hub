import { extname } from 'path';

interface LanguageInfo {
  language: string;
  color: string;
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  '.ts':     { language: 'TypeScript',  color: '#3178c6' },
  '.tsx':    { language: 'TypeScript',  color: '#3178c6' },
  '.mts':    { language: 'TypeScript',  color: '#3178c6' },
  '.js':     { language: 'JavaScript', color: '#f1e05a' },
  '.jsx':    { language: 'JavaScript', color: '#f1e05a' },
  '.mjs':    { language: 'JavaScript', color: '#f1e05a' },
  '.cjs':    { language: 'JavaScript', color: '#f1e05a' },
  '.py':     { language: 'Python',      color: '#3572a5' },
  '.pyw':    { language: 'Python',      color: '#3572a5' },
  '.html':   { language: 'HTML',        color: '#e34c26' },
  '.htm':    { language: 'HTML',        color: '#e34c26' },
  '.css':    { language: 'CSS',         color: '#563d7c' },
  '.scss':   { language: 'SCSS',        color: '#c6538c' },
  '.sass':   { language: 'Sass',        color: '#a53b70' },
  '.less':   { language: 'Less',        color: '#1d365d' },
  '.json':   { language: 'JSON',        color: '#292929' },
  '.jsonc':  { language: 'JSON',        color: '#292929' },
  '.md':     { language: 'Markdown',    color: '#083fa1' },
  '.mdx':    { language: 'MDX',         color: '#fcb32c' },
  '.rs':     { language: 'Rust',        color: '#dea584' },
  '.go':     { language: 'Go',          color: '#00add8' },
  '.java':   { language: 'Java',        color: '#b07219' },
  '.kt':     { language: 'Kotlin',      color: '#a97bff' },
  '.kts':    { language: 'Kotlin',      color: '#a97bff' },
  '.swift':  { language: 'Swift',       color: '#fa7343' },
  '.rb':     { language: 'Ruby',        color: '#701516' },
  '.php':    { language: 'PHP',         color: '#4f5d95' },
  '.c':      { language: 'C',           color: '#555555' },
  '.h':      { language: 'C',           color: '#555555' },
  '.cpp':    { language: 'C++',         color: '#f34b7d' },
  '.cc':     { language: 'C++',         color: '#f34b7d' },
  '.cxx':    { language: 'C++',         color: '#f34b7d' },
  '.hpp':    { language: 'C++',         color: '#f34b7d' },
  '.cs':     { language: 'C#',          color: '#178600' },
  '.sh':     { language: 'Shell',       color: '#89e051' },
  '.bash':   { language: 'Shell',       color: '#89e051' },
  '.zsh':    { language: 'Shell',       color: '#89e051' },
  '.yaml':   { language: 'YAML',        color: '#cb171e' },
  '.yml':    { language: 'YAML',        color: '#cb171e' },
  '.sql':    { language: 'SQL',         color: '#e38c00' },
  '.vue':    { language: 'Vue',         color: '#41b883' },
  '.svelte': { language: 'Svelte',      color: '#ff3e00' },
  '.dart':   { language: 'Dart',        color: '#00b4ab' },
  '.r':      { language: 'R',           color: '#198ce7' },
  '.lua':    { language: 'Lua',         color: '#000080' },
  '.ex':     { language: 'Elixir',      color: '#6e4a7e' },
  '.exs':    { language: 'Elixir',      color: '#6e4a7e' },
  '.hs':     { language: 'Haskell',     color: '#5e5086' },
  '.ml':     { language: 'OCaml',       color: '#3be133' },
  '.tf':     { language: 'HCL',         color: '#844fba' },
  '.prisma': { language: 'Prisma',      color: '#0c344b' },
  '.graphql':{ language: 'GraphQL',     color: '#e10098' },
  '.toml':   { language: 'TOML',        color: '#9c4221' },
  '.xml':    { language: 'XML',         color: '#0060ac' },
  '.dockerfile':{ language: 'Dockerfile', color: '#384d54' },
};

// Extensions to skip when computing language breakdown
const SKIP_EXTENSIONS = new Set([
  '.lock', '.log', '.txt', '.env', '.gitignore',
  '.gitattributes', '.editorconfig', '.prettierrc',
  '.eslintrc', '.babelrc', '.map', '.min.js',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.webp', '.avif', '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
]);

export interface LanguageBreakdown {
  language: string;
  color: string;
  bytes: number;
  percentage: number;
}

export function detectLanguages(files: Array<{ path: string; size: number }>): LanguageBreakdown[] {
  const totals = new Map<string, { color: string; bytes: number }>();
  let totalBytes = 0;

  for (const file of files) {
    const ext = extname(file.path).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) continue;

    // Special case for Dockerfile
    const basename = file.path.split('/').pop() ?? '';
    const langKey = basename.toLowerCase() === 'dockerfile' ? '.dockerfile' : ext;

    const info = LANGUAGE_MAP[langKey];
    if (!info) continue;

    const existing = totals.get(info.language);
    if (existing) {
      existing.bytes += file.size;
    } else {
      totals.set(info.language, { color: info.color, bytes: file.size });
    }
    totalBytes += file.size;
  }

  if (totalBytes === 0) return [];

  const breakdown: LanguageBreakdown[] = [];
  for (const [language, { color, bytes }] of totals.entries()) {
    breakdown.push({
      language,
      color,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 1000) / 10,
    });
  }

  return breakdown.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
}

export function computeHealthScore(opts: {
  hasDescription: boolean;
  hasTopics: boolean;
  daysSinceUpdate: number;
  isArchived: boolean;
  starCount: number;
  hasLanguages: boolean;
}): number {
  let score = 0;

  if (opts.hasDescription)               score += 25;
  if (opts.hasTopics)                    score += 15;
  if (opts.daysSinceUpdate <= 7)         score += 30;
  else if (opts.daysSinceUpdate <= 30)   score += 20;
  else if (opts.daysSinceUpdate <= 90)   score += 10;
  if (!opts.isArchived)                  score += 15;
  if (opts.starCount > 0)                score += 10;
  if (opts.hasLanguages)                 score += 5;

  return Math.min(score, 100);
}
