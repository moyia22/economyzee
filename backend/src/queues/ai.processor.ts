import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GeminiService } from '../modules/ai/gemini.service';

@Processor('ai-processing')
export class AIProcessor {
  private readonly logger = new Logger(AIProcessor.name);

  constructor(private gemini: GeminiService) {}

  @Process('parse-text')
  async parseText(job: Job<{ text: string }>) {
    this.logger.log('AI processing text');
    return this.gemini.parseText(job.data.text);
  }

  @Process('parse-pdf')
  async parsePdf(job: Job<{ text: string }>) {
    this.logger.log('AI processing PDF text');
    return this.gemini.parsePdfText(job.data.text);
  }
}
