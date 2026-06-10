import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class TempFilesService {
  private readonly logger = new Logger(TempFilesService.name);
  private readonly baseDir: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<string>('workDir');
    this.baseDir = configured?.trim() || path.join(os.tmpdir(), 'autoclipr');
  }

  async createJobDir(videoId: string): Promise<string> {
    const dir = path.join(this.baseDir, videoId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  jobPath(dir: string, name: string): string {
    return path.join(dir, name);
  }

  async cleanup(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`Failed to cleanup ${dir}: ${err}`);
    }
  }
}
