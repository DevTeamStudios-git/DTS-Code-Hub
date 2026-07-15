// Maps file extensions to highlight.js language names
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python',     '.pyw': 'python',
  '.html': 'html',     '.htm': 'html',
  '.css': 'css',       '.scss': 'scss',      '.sass': 'scss',      '.less': 'less',
  '.json': 'json',     '.jsonc': 'json',
  '.md': 'markdown',   '.mdx': 'markdown',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',     '.kts': 'kotlin',
  '.swift': 'swift',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',           '.h': 'c',
  '.cpp': 'cpp',       '.cc': 'cpp',         '.cxx': 'cpp',        '.hpp': 'cpp',
  '.cs': 'csharp',
  '.sh': 'bash',       '.bash': 'bash',      '.zsh': 'bash',
  '.yaml': 'yaml',     '.yml': 'yaml',
  '.sql': 'sql',
  '.vue': 'xml',
  '.svelte': 'xml',
  '.dart': 'dart',
  '.r': 'r',
  '.lua': 'lua',
  '.tf': 'hcl',
  '.graphql': 'graphql',
  '.toml': 'ini',
  '.xml': 'xml',
  '.prisma': 'plaintext',
  '.env': 'bash',
  '.gitignore': 'bash',
  '.dockerfile': 'dockerfile',
};

const IMAGE_EXTS  = new Set(['.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.bmp','.tiff','.svg']);
const BINARY_EXTS = new Set([
  '.pdf','.zip','.tar','.gz','.rar','.7z','.exe','.bin','.dll','.so',
  '.woff','.woff2','.ttf','.eot','.otf',
  '.mp4','.mov','.avi','.mp3','.wav','.ogg',
]);

export function getLanguage(filename: string): string {
  const ext = filename.includes('.') ? `.${filename.split('.').pop()!.toLowerCase()}` : '';
  if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

export function isImage(filename: string): boolean {
  const ext = `.${filename.split('.').pop()?.toLowerCase()}`;
  return IMAGE_EXTS.has(ext);
}

export function isBinary(filename: string): boolean {
  const ext = `.${filename.split('.').pop()?.toLowerCase()}`;
  return BINARY_EXTS.has(ext);
}

export function fileIcon(filename: string, isDir: boolean): string {
  if (isDir) return '📁';
  const ext = `.${filename.split('.').pop()?.toLowerCase()}`;
  if (IMAGE_EXTS.has(ext))  return '🖼';
  if (BINARY_EXTS.has(ext)) return '📦';
  const icons: Record<string, string> = {
    '.md': '📝', '.json': '{}', '.ts': 'TS', '.tsx': 'TS',
    '.js': 'JS', '.jsx': 'JS', '.html': '🌐', '.css': '🎨',
    '.scss': '🎨', '.py': '🐍', '.rs': '🦀', '.go': '🐹',
    '.sh': '⚡', '.yaml': '⚙', '.yml': '⚙', '.sql': '🗄',
    '.env': '🔒', '.gitignore': '🚫',
  };
  return icons[ext] ?? '📄';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
