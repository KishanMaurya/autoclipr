import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const WIN_YTDLP = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'Microsoft',
  'WinGet',
  'Links',
  'yt-dlp.exe',
);

const WIN_FFMPEG = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'Microsoft',
  'WinGet',
  'Packages',
);

function findWinGetFfmpeg(): string | null {
  try {
    const packages = fs.readdirSync(WIN_FFMPEG);
    const pkg = packages.find((p) => p.toLowerCase().startsWith('yt-dlp.ffmpeg'));
    if (!pkg) return null;
    const bin = path.join(WIN_FFMPEG, pkg, 'ffmpeg-N-124716-g054dffd133-win64-gpl', 'bin', 'ffmpeg.exe');
    if (fs.existsSync(bin)) return bin;
    const pkgDir = path.join(WIN_FFMPEG, pkg);
    for (const entry of fs.readdirSync(pkgDir)) {
      const candidate = path.join(pkgDir, entry, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveBinary(envPath: string | undefined, defaultName: string): string {
  if (envPath?.trim()) return envPath.trim();

  const candidates =
    defaultName === 'yt-dlp'
      ? [WIN_YTDLP]
      : defaultName === 'ffmpeg'
        ? [findWinGetFfmpeg()].filter(Boolean)
        : defaultName === 'ffprobe'
          ? [findWinGetFfmpeg()?.replace(/ffmpeg\.exe$/i, 'ffprobe.exe')].filter(Boolean)
          : [];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }

  return defaultName;
}
