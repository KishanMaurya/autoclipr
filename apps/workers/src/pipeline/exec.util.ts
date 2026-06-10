import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function runCommand(
  bin: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number; maxBuffer?: number },
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, timeoutMs = 600_000, maxBuffer = 50 * 1024 * 1024 } = options ?? {};
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer,
      windowsHide: true,
    });
    return {
      stdout: stdout?.toString() ?? '',
      stderr: stderr?.toString() ?? '',
    };
  } catch (err: unknown) {
    const e = err as { code?: string; stdout?: Buffer; stderr?: Buffer; message?: string };
    const detail = [e.stderr?.toString(), e.stdout?.toString(), e.message]
      .filter(Boolean)
      .join('\n');

    if (e.code === 'ENOENT') {
      throw new Error(
        `${bin} is not installed or not on PATH. On Windows: winget install ${bin === 'yt-dlp' ? 'yt-dlp.yt-dlp' : bin === 'ffmpeg' ? 'Gyan.FFmpeg' : bin}`,
      );
    }

    throw new Error(`${bin} failed: ${detail.slice(0, 500)}`);
  }
}

/** FFmpeg subtitles filter needs escaped paths (especially on Windows). */
export function escapeFfmpegPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}
