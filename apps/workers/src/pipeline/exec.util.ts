import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const FFMPEG_NOISE =
  /^(ffmpeg|ffprobe) version |^Copyright |^  (lib|configuration:|built with )/i;

function formatCommandError(bin: string, detail: string): string {
  const lines = detail
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !FFMPEG_NOISE.test(line));

  const meaningful = lines.length > 0 ? lines.join(' ') : detail.replace(/\s+/g, ' ').trim();
  return `${bin} failed: ${meaningful.slice(0, 500)}`;
}

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

    throw new Error(formatCommandError(bin, detail));
  }
}

/** FFmpeg subtitles filter needs escaped paths (especially on Windows). */
export function escapeFfmpegPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}
