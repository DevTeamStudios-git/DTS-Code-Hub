import { join } from 'path';
import { mkdir, rm, cp, writeFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import simpleGit from 'simple-git';

const REPOS_ROOT = process.env.REPOS_ROOT ?? '/repos';

export function getRepoDiskPath(username: string, repoName: string): string {
  return join(REPOS_ROOT, username, `${repoName}.git`);
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
