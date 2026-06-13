import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/** Resolve a Netscape cookies file path from env (file path or base64 content). */
export async function resolveYtdlpCookiesFile(config: {
  cookiesFile?: string;
  cookiesB64?: string;
}): Promise<string | undefined> {
  const file = config.cookiesFile?.trim();
  if (file) {
    await fs.access(file);
    return file;
  }

  const b64 = config.cookiesB64?.trim();
  if (!b64) return undefined;

  const dest = path.join(os.tmpdir(), 'autoclipr-ytdlp-cookies.txt');
  const content = Buffer.from(b64, 'base64').toString('utf8');
  if (!content.includes('youtube.com')) {
    throw new Error('YTDLP_COOKIES_B64 does not look like a YouTube Netscape cookies file');
  }
  await fs.writeFile(dest, content, { mode: 0o600 });
  return dest;
}
