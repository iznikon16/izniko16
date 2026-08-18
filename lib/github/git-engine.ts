import { spawn } from 'child_process';
import path from 'path';

/**
 * Runs a git command safely using spawn.
 * Avoids shell=true to prevent command injection.
 */
function runGitCommand(args: string[], cwd: string, env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Avoid running dangerous commands blindly
    if (args.includes('--force') || args.includes('-f')) {
      return reject(new Error('Force push/pull is not allowed for security reasons.'));
    }

    const gitProcess = spawn('git', args, {
      cwd,
      env: { ...process.env, ...env }, // Allow passing custom env for credentials
      shell: false, 
    });

    let stdout = '';
    let stderr = '';

    gitProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    gitProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    gitProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = new Error(`Git command failed with code ${code}`) as any;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    gitProcess.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Mask secret tokens in git output to prevent leakage in logs
 */
export function sanitizeGitOutput(output: string, token: string): string {
  if (!output || !token) return output;
  return output.split(token).join('***MASKED_TOKEN***');
}

/**
 * Returns the repository root path. This enforces that operations only run on the main repository.
 */
export function getRepoRoot(): string {
  // In Next.js, process.cwd() is the root of the project.
  return process.cwd();
}

/**
 * Common Git Operations Abstraction
 */
export const GitEngine = {
  async getStatus() {
    const cwd = getRepoRoot();
    try {
      const { stdout } = await runGitCommand(['status', '--porcelain', '--branch'], cwd);
      
      const lines = stdout.split('\n');
      const branchLine = lines.shift() || '';
      
      let branch = 'unknown';
      let ahead = 0;
      let behind = 0;

      // Parse branch line: e.g. "## main...origin/main [ahead 1]" or "## main"
      if (branchLine.startsWith('## ')) {
        const branchInfo = branchLine.substring(3);
        const match = branchInfo.match(/^([^\s]+)(?:\.\.\.[^\s]+)?(?:\s+\[(.*)\])?/);
        if (match) {
          branch = match[1];
          const tracking = match[2];
          if (tracking) {
            if (tracking.includes('ahead')) {
              const m = tracking.match(/ahead (\d+)/);
              if (m) ahead = parseInt(m[1], 10);
            }
            if (tracking.includes('behind')) {
              const m = tracking.match(/behind (\d+)/);
              if (m) behind = parseInt(m[1], 10);
            }
          }
        }
      }

      return {
        branch,
        ahead,
        behind,
        hasLocalChanges: lines.length > 0,
        uncommittedFiles: lines,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate GitHub URL
   */
  validateUrl(remoteUrl: string) {
    if (!remoteUrl) throw new Error('Repository URL is required.');
    
    let urlObj;
    try {
      urlObj = new URL(remoteUrl);
    } catch {
      throw new Error('Invalid URL format.');
    }

    if (urlObj.protocol !== 'https:') {
      throw new Error('Only HTTPS protocol is supported.');
    }
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Only github.com is supported as a remote.');
    }
    
    // Güvenlik için temiz URL döndürüyoruz, içinde token/user kalmaz.
    return `https://github.com${urlObj.pathname}`;
  },

  /**
   * Builds secure environment variables for Git using extraHeader
   */
  buildGitEnv(token: string) {
    const authHeader = `Authorization: Basic ${Buffer.from(`oauth2:${token}`).toString('base64')}`;
    return {
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'echo',
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.extraHeader',
      GIT_CONFIG_VALUE_0: authHeader
    };
  },

  async fetch(remoteUrl: string, token: string) {
    const cwd = getRepoRoot();
    const safeUrl = this.validateUrl(remoteUrl);
    const secureEnv = this.buildGitEnv(token);

    try {
      const { stdout, stderr } = await runGitCommand(['fetch', safeUrl, '--prune'], cwd, secureEnv);
      return { stdout: sanitizeGitOutput(stdout, token), stderr: sanitizeGitOutput(stderr, token) };
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      if (err.stderr) err.stderr = sanitizeGitOutput(err.stderr, token);
      if (err.message) err.message = sanitizeGitOutput(err.message, token);
      throw err;
    }
  },

  async getLastCommit() {
    const cwd = getRepoRoot();
    const { stdout } = await runGitCommand(['log', '-1', '--format=%H|%an|%s|%cI'], cwd);
    const [sha, author, message, date] = stdout.split('|');
    return {
      sha,
      shortSha: sha.substring(0, 7),
      author,
      message,
      date,
    };
  },
  
  async push(remoteUrl: string, token: string, branch: string) {
    const cwd = getRepoRoot();
    const safeUrl = this.validateUrl(remoteUrl);
    
    // Validate branch parameter simply to avoid injection
    if (!branch || !/^[a-zA-Z0-9_\-\/]+$/.test(branch) || branch.includes('..')) {
      throw new Error('Invalid branch name.');
    }

    const secureEnv = this.buildGitEnv(token);

    try {
      const { stdout, stderr } = await runGitCommand(['push', safeUrl, `HEAD:refs/heads/${branch}`], cwd, secureEnv);
      return { stdout: sanitizeGitOutput(stdout, token), stderr: sanitizeGitOutput(stderr, token) };
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      if (err.stderr) err.stderr = sanitizeGitOutput(err.stderr, token);
      if (err.message) err.message = sanitizeGitOutput(err.message, token);
      throw err;
    }
  },

  async addAndCommit(message: string) {
    const cwd = getRepoRoot();
    
    // Push öncesi çok kaba bir secret taraması yap. (Phase 4 requirement)
    const { stdout: diff } = await runGitCommand(['diff', '--cached', '--name-only'], cwd);
    if (diff) {
      const changedFiles = diff.split('\n');
      for (const file of changedFiles) {
        if (file.includes('.env') || file.endsWith('.pem') || file.endsWith('.key')) {
          await runGitCommand(['reset', 'HEAD', '--', file], cwd); // Unstage secret file
          throw new Error(`Güvenlik: Hassas bilgi içerebilecek dosya yakalandı ve geri alındı (${file}). Yedekleme durduruldu.`);
        }
      }
    }

    await runGitCommand(['add', '.'], cwd);
    
    // Re-check after add (in case of new tracked secrets)
    const { stdout: finalDiff } = await runGitCommand(['diff', '--cached', '--name-only'], cwd);
    if (finalDiff) {
      const finalFiles = finalDiff.split('\n');
      for (const file of finalFiles) {
        if (file.includes('.env') || file.endsWith('.pem') || file.endsWith('.key')) {
           await runGitCommand(['reset', 'HEAD'], cwd);
           throw new Error(`Yedekleme durduruldu. Hassas bilgi içerebilecek dosyalar tespit edildi: ${file}`);
        }
      }
    }

    await runGitCommand(['commit', '-m', message], cwd);
  }
};
