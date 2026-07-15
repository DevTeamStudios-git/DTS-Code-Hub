import { join, resolve } from 'path';
import { mkdir, rm, cp, writeFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import simpleGit from 'simple-git';

const REPOS_ROOT = process.env.REPOS_ROOT ?? '/repos';

export function getRepoDiskPath(username: string, repoName: string): string {
  return resolve(REPOS_ROOT, username, `${repoName}.git`);
}

export async function initBareRepo(username: string, repoName: string): Promise<string> {
  const diskPath = getRepoDiskPath(username, repoName);
  await mkdir(diskPath, { recursive: true });

  // Use simple-git raw to run git init --bare
  const git = simpleGit();
  await git.raw(['init', '--bare', '--initial-branch=main', diskPath]);
  await writeFile(join(diskPath, 'HEAD'), 'ref: refs/heads/main\n', 'utf8');

  return diskPath;
}

export async function initRepoFromFiles(
  username: string,
  repoName: string,
  files: Array<{ path: string; content: Buffer }>,
  commitMessage = 'Initial commit',
  authorName = username,
  authorEmail = `${username}@dts-code-hub.local`,
): Promise<string> {
  const diskPath = getRepoDiskPath(username, repoName);
  const { mkdtemp } = await import('fs/promises');
  const { tmpdir } = await import('os');
  const { dirname } = await import('path');

  const workDir = await mkdtemp(join(tmpdir(), 'dts-repo-'));

  try {
    // Write all files to work dir
    for (const file of files) {
      const fullPath = join(workDir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content);
    }

    // Init bare repo on disk
    await mkdir(diskPath, { recursive: true });
    const bareGit = simpleGit();
    await bareGit.raw(['init', '--bare', '--initial-branch=main', diskPath]);
    await writeFile(join(diskPath, 'HEAD'), 'ref: refs/heads/main\n', 'utf8');

    // Init working repo, commit, push to bare
    const git = simpleGit(workDir);
    await git.raw(['init', '--initial-branch=main']);
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);
    await git.add('.');
    await git.commit(commitMessage);
    await git.addRemote('origin', diskPath);
    await git.push('origin', 'main');

    return diskPath;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function deleteRepoDisk(diskPath: string): Promise<void> {
  if (existsSync(diskPath)) {
    await rm(diskPath, { recursive: true, force: true });
  }
}

export async function forkRepoDisk(
  sourceDiskPath: string,
  destUsername: string,
  destRepoName: string,
): Promise<string> {
  const destPath = getRepoDiskPath(destUsername, destRepoName);
  await mkdir(join(REPOS_ROOT, destUsername), { recursive: true });

  if (existsSync(sourceDiskPath)) {
    await cp(sourceDiskPath, destPath, { recursive: true });
  } else {
    await initBareRepo(destUsername, destRepoName);
  }

  return destPath;
}

export async function renameRepoDisk(
  username: string,
  oldName: string,
  newName: string,
): Promise<string> {
  const oldPath = getRepoDiskPath(username, oldName);
  const newPath = getRepoDiskPath(username, newName);

  if (existsSync(oldPath)) {
    await rename(oldPath, newPath);
  }

  return newPath;
}

export async function getRepoFileListing(diskPath: string): Promise<Array<{ path: string; size: number }>> {
  if (!existsSync(diskPath)) return [];
  try {
    const git = simpleGit(diskPath);
    const log = await git.log(['--oneline', '-1']);
    if (!log.latest) return [];

    const result = await git.raw(['ls-tree', '-r', '--long', 'HEAD']);
    const files: Array<{ path: string; size: number }> = [];

    for (const line of result.split('\n')) {
      const match = line.match(/^\d+\s+\w+\s+\w+\s+(\d+)\s+(.+)$/);
      if (match) {
        files.push({ path: match[2].trim(), size: parseInt(match[1], 10) });
      }
    }

    return files;
  } catch {
    return [];
  }
}

export async function getRepoCommitCount(diskPath: string): Promise<number> {
  if (!existsSync(diskPath)) return 0;
  try {
    const git = simpleGit(diskPath);
    const result = await git.raw(['rev-list', '--count', 'HEAD']);
    return parseInt(result.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

// ── Phase 4: File browser helpers ────────────────────────────────────────

export interface TreeEntry {
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  name: string;
  size: number | null;
  path: string;
}

export interface CommitMeta {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export async function getDirectoryListing(
  diskPath: string,
  branch: string,
  subPath = '',
): Promise<{ entries: TreeEntry[]; lastCommit: CommitMeta | null }> {
  if (!existsSync(diskPath)) return { entries: [], lastCommit: null };

  const git = simpleGit(diskPath);
  const ref = subPath ? `${branch}:${subPath}` : branch;

  // ls-tree for directory contents
  const raw = await git.raw([
    'ls-tree', '--long', ref,
  ]).catch(() => '');

  const entries: TreeEntry[] = raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(\d+)\s+(blob|tree)\s+(\S+)\s+(\S+)\s+(.+)$/);
      if (!match) return null;
      const [, mode, type, sha, sizeRaw, name] = match;
      return {
        mode,
        type: type as 'blob' | 'tree',
        sha,
        size: sizeRaw === '-' ? null : parseInt(sizeRaw, 10),
        name: name.trim(),
        path: subPath ? `${subPath}/${name.trim()}` : name.trim(),
      };
    })
    .filter((e): e is TreeEntry => e !== null)
    .sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // Last commit touching this path
  let lastCommit: CommitMeta | null = null;
  try {
    const logArgs = ['log', '-1', '--format=%H|%s|%an|%aI', branch];
    if (subPath) logArgs.push('--', subPath);
    const logRaw = await git.raw(logArgs);
    const [sha, message, author, date] = logRaw.trim().split('|');
    if (sha) lastCommit = { sha, message, author, date };
  } catch { /* empty repo */ }

  return { entries, lastCommit };
}

export async function getFileContent(
  diskPath: string,
  branch: string,
  filePath: string,
): Promise<{ content: Buffer; size: number; sha: string } | null> {
  if (!existsSync(diskPath)) return null;
  const git = simpleGit(diskPath);

  try {
    // Get SHA and size first
    const lsRaw = await git.raw(['ls-tree', '-l', branch, '--', filePath]);
    const match = lsRaw.trim().match(/^(\d+)\s+(blob|tree)\s+(\S+)\s+(\S+)\s+/);
    if (!match) return null;
    const [, , sha, sizeStr] = match;
    const size = parseInt(sizeStr, 10);

    // Limit to 5MB for display
    if (size > 5 * 1024 * 1024) {
      return { content: Buffer.from(`[File too large to display: ${(size / 1024 / 1024).toFixed(1)} MB]`), size, sha };
    }

    const raw = await git.raw(['show', `${branch}:${filePath}`]);
    return { content: Buffer.from(raw, 'binary'), size, sha };
  } catch {
    return null;
  }
}

export async function getFileBlame(
  diskPath: string,
  branch: string,
  filePath: string,
): Promise<Array<{ sha: string; author: string; date: string; line: number; content: string }>> {
  if (!existsSync(diskPath)) return [];
  const git = simpleGit(diskPath);

  try {
    const raw = await git.raw(['blame', '--porcelain', branch, '--', filePath]);
    const lines: Array<{ sha: string; author: string; date: string; line: number; content: string }> = [];

    const lineBlocks = raw.split('\n');
    let currentSha = '';
    let currentAuthor = '';
    let currentDate = '';
    let lineNo = 0;

    for (const l of lineBlocks) {
      if (/^[0-9a-f]{40}/.test(l)) {
        const parts = l.split(' ');
        currentSha = parts[0];
        lineNo = parseInt(parts[2] ?? '0', 10);
      } else if (l.startsWith('author ')) {
        currentAuthor = l.slice(7);
      } else if (l.startsWith('author-time ')) {
        currentDate = new Date(parseInt(l.slice(12), 10) * 1000).toISOString();
      } else if (l.startsWith('\t')) {
        lines.push({ sha: currentSha, author: currentAuthor, date: currentDate, line: lineNo, content: l.slice(1) });
      }
    }

    return lines;
  } catch {
    return [];
  }
}

export async function searchInRepository(
  diskPath: string,
  branch: string,
  query: string,
  maxResults = 50,
): Promise<Array<{ file: string; line: number; content: string; match: string }>> {
  if (!existsSync(diskPath) || !query.trim()) return [];
  const git = simpleGit(diskPath);

  try {
    const raw = await git.raw([
      'grep', '-n', '-i', '--max-count=5',
      '-e', query,
      branch,
    ]);

    return raw
      .split('\n')
      .filter(Boolean)
      .slice(0, maxResults)
      .map(line => {
        // format: branch:file:lineNo:content
        const firstColon = line.indexOf(':');
        const rest = line.slice(firstColon + 1);
        const secondColon = rest.indexOf(':');
        const file = rest.slice(0, secondColon);
        const afterFile = rest.slice(secondColon + 1);
        const thirdColon = afterFile.indexOf(':');
        const lineNo = parseInt(afterFile.slice(0, thirdColon), 10);
        const content = afterFile.slice(thirdColon + 1);
        return { file, line: lineNo, content, match: query };
      });
  } catch {
    return [];
  }
}

export async function getLastCommitForPaths(
  diskPath: string,
  branch: string,
  paths: string[],
): Promise<Record<string, CommitMeta>> {
  if (!existsSync(diskPath) || paths.length === 0) return {};
  const git = simpleGit(diskPath);
  const result: Record<string, CommitMeta> = {};

  await Promise.all(
    paths.map(async p => {
      try {
        const raw = await git.raw(['log', '-1', '--format=%H|%s|%an|%aI', branch, '--', p]);
        const [sha, message, author, date] = raw.trim().split('|');
        if (sha) result[p] = { sha, message, author, date };
      } catch { /* skip */ }
    }),
  );

  return result;
}

export async function writeFileAndCommit(
  diskPath: string,
  branch: string,
  filePath: string,
  content: string,
  commitMessage: string,
  authorName: string,
  authorEmail = `${authorName}@dts-code-hub.local`,
): Promise<string> {
  const { mkdtemp, writeFile, mkdir, rm } = await import('fs/promises');
  const { tmpdir } = await import('os');
  const { dirname, join } = await import('path');

  const workDir = await mkdtemp(join(tmpdir(), 'dts-edit-'));
  console.log(`[writeFileAndCommit] workDir: ${workDir}, diskPath: ${diskPath}, branch: ${branch}`);
  
  try {
    const wg = simpleGit();
    console.log(`[writeFileAndCommit] Cloning ${diskPath} to ${workDir}...`);
    await wg.clone(diskPath, workDir, ['--branch', branch]);
    console.log(`[writeFileAndCommit] Clone successful`);

    const git = simpleGit(workDir);
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);

    const fullPath = join(workDir, filePath);
    console.log(`[writeFileAndCommit] Writing file to ${fullPath}`);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');

    console.log(`[writeFileAndCommit] Adding ${filePath}...`);
    await git.add(filePath);
    console.log(`[writeFileAndCommit] Committing...`);
    const result = await git.commit(commitMessage);
    console.log(`[writeFileAndCommit] Pushing to ${branch}...`);
    await git.push('origin', branch);
    console.log(`[writeFileAndCommit] Push successful`);

    return result.commit;
  } catch (err) {
    console.error('[writeFileAndCommit] Error:', err);
    throw err;
  } finally {
    console.log(`[writeFileAndCommit] Cleaning up ${workDir}`);
    await rm(workDir, { recursive: true, force: true });
  }
}
