import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const ERROR_KEYWORD =
  /error|invalid|unable|failed|not found|no such|fontconfig|libass|subtitle|permission denied|conversion failed|cannot open|no decoder|warning|no streams|matches no streams|unrecognized option/i;

function extractMeaningfulError(detail: string): string {
  const normalized = detail.replace(/\r\n/g, '\n').trim();

  const bannerStripped = normalized.replace(
    /(?:ffmpeg|ffprobe) version[\s\S]*?(?=\nInput #|\n\[|\nError|\nInvalid|\nUnable|\nNo such|\nConversion failed|\n\[Parsed_|\n\[subtitles|\n\[ass @)/i,
    '',
  );

  const errorLines = bannerStripped
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && ERROR_KEYWORD.test(line));

  if (errorLines.length > 0) {
    return errorLines.join(' ');
  }

  const configStripped = bannerStripped
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^built with /i.test(line) &&
        !/^configuration:/i.test(line) &&
        !/^--enable-/i.test(line) &&
        !/^lib\w+ --/i.test(line) &&
        !/^Copyright /i.test(line),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return configStripped || normalized.replace(/\s+/g, ' ').trim();
}

function formatCommandError(bin: string, detail: string): string {
  const meaningful = extractMeaningfulError(detail);
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
