import { Queue, Worker, type Job } from 'bullmq';
import { logger } from './logger.js';

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : null;

export type AIJobData = {
  type: 'analyze-listing';
  userId: string;
  jobId: string;
  url: string;
  priceOverride?: number;
} | {
  type: 'grade-scan';
  userId: string;
  jobId: string;
  frontObjectPath?: string;
  backObjectPath?: string;
  imageBase64?: string;
  backImageBase64?: string;
  mimeType?: string;
  backMimeType?: string;
  cardName: string;
};

export type AIJobResult = {
  status: 'done' | 'error';
  data?: unknown;
  error?: string;
};

let aiQueue: Queue<AIJobData, AIJobResult> | null = null;

export function getAIQueue(): Queue<AIJobData, AIJobResult> | null {
  if (!connection) return null;
  if (!aiQueue) {
    aiQueue = new Queue('ai-jobs', { connection });
  }
  return aiQueue;
}

export function startAIWorker(
  processor: (job: Job<AIJobData, AIJobResult>) => Promise<AIJobResult>
): Worker<AIJobData, AIJobResult> | null {
  if (!connection) {
    logger.warn('REDIS_URL not set — AI job queue disabled, falling back to synchronous processing');
    return null;
  }
  const worker = new Worker<AIJobData, AIJobResult>('ai-jobs', processor, {
    connection,
    concurrency: 3,
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'AI job failed');
  });
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, type: (job.data as AIJobData).type }, 'AI job completed');
  });
  return worker;
}
