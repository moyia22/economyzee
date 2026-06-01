import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';

export class FriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendlyError';
  }
}

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);
  private tempDir = 'C:\\economyzee-temp';

  constructor(private config: ConfigService) {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async transcribe(fileUrl: string): Promise<string> {
    const tempId = `voice-${Date.now()}`;
    const tempOggPath = path.join(this.tempDir, `${tempId}.ogg`);

    try {
      this.logger.log(`[STT] Início: Baixando áudio para transcrição`);
      
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const buffer = Buffer.from(response.data);
      if (buffer.length === 0) throw new Error('Áudio vazio');
      await fs.promises.writeFile(tempOggPath, buffer);

      // 1. Try Local Whisper (with retry)
      try {
        const text = await this.transcribeLocalWithRetry(tempOggPath);
        if (text) return text;
      } catch (e: any) {
        this.logger.warn(`[STT] Local Whisper falhou: ${e.message}`);
      }

      // 2. Try OpenAI Whisper API if key exists
      const openAiKey = this.config.get('OPENAI_API_KEY');
      if (openAiKey) {
        try {
          const text = await this.transcribeWithOpenAi(tempOggPath);
          if (text) return text;
        } catch (e: any) {
          this.logger.warn(`[STT] OpenAI Whisper falhou: ${e.message}`);
        }
      }

      throw new FriendlyError('Não consegui transcrever o áudio automaticamente. Pode enviar em texto ou tentar novamente?');
    } catch (e: any) {
      this.logger.error('[STT] Erro crítico durante transcrição', e.message);
      if (e instanceof FriendlyError) throw e;
      throw new FriendlyError('Erro técnico no processamento de áudio.');
    } finally {
      await this.deleteTempFiles(tempId);
    }
  }

  private async transcribeLocalWithRetry(filePath: string, retries = 2): Promise<string> {
    const ffmpegOk = await this.checkFfmpegAvailable();
    if (!ffmpegOk) throw new Error('FFmpeg não encontrado');

    for (let i = 0; i < retries; i++) {
      try {
        this.logger.log(`[STT] Whisper Local (Tentativa ${i+1})...`);
        return await this.transcribeLocal(filePath);
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return '';
  }

  private async transcribeWithOpenAi(filePath: string): Promise<string> {
    const apiKey = this.config.get('OPENAI_API_KEY');
    const formData = new (require('form-data'))();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 20000
    });

    return response.data.text;
  }

  private async transcribeLocal(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use 'whisper' command directly if available, otherwise fallback to 'py -m whisper'
      const cmd = process.platform === 'win32' ? 'whisper' : 'whisper';
      const args = [filePath, '--language', 'pt', '--model', 'base', '--output_format', 'txt', '--output_dir', this.tempDir, '--fp16', 'False'];

      const whisper = spawn(cmd, args, { shell: true, windowsHide: true });
      
      const timeout = setTimeout(() => {
        whisper.kill();
        reject(new Error('Whisper timeout'));
      }, 45000);

      let stdoutData = '';
      let stderrData = '';
      whisper.stdout.on('data', (data) => { stdoutData += data.toString(); });
      whisper.stderr.on('data', (data) => { stderrData += data.toString(); });
      
      whisper.on('close', async (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.logger.error(`[STT] Whisper stderr: ${stderrData}`);
          return reject(new Error(`Whisper exit ${code}`));
        }

        const txtFile = filePath.replace('.ogg', '.txt');
        if (fs.existsSync(txtFile)) {
          const text = await fs.promises.readFile(txtFile, 'utf-8');
          resolve(text.trim());
        } else {
          // If no file, try to extract from stdout
          const match = stdoutData.match(/\[.*\]\s*(.*)/);
          resolve(match ? match[1].trim() : stdoutData.trim());
        }
      });

      whisper.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private async deleteTempFiles(tempId: string) {
    const extensions = ['.ogg', '.txt', '.srt', '.vtt', '.json', '.tsv'];
    for (const ext of extensions) {
      const file = path.join(this.tempDir, `${tempId}${ext}`);
      try { if (fs.existsSync(file)) await fs.promises.unlink(file); } catch (e) {}
    }
  }

  private async checkFfmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('ffmpeg -version', (error) => resolve(!error));
    });
  }
}
