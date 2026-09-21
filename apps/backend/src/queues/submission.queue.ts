import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';

export interface SubmissionJobData {
  submissionId: string;
  challengeId: string;
  candidateId: string;
  language: string;
  sourceCode: string;
}

export const submissionQueue = new Queue<SubmissionJobData>('code-execution', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

/**
 * Enqueues a submission for sandboxed execution. Using the submission's own
 * id as the BullMQ jobId makes a duplicate enqueue (e.g. a retried HTTP
 * request) a no-op instead of double-running the candidate's code.
 */
export async function enqueueSubmission(data: SubmissionJobData) {
  return submissionQueue.add('execute', data, {
    jobId: data.submissionId,
  });
}
