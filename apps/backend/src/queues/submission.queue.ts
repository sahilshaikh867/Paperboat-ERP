import { Queue } from 'bullmq';
import { createRedisConnection, isRedisConfigured } from '../config/redis';

export interface SubmissionJobData {
  submissionId: string;
  challengeId: string;
  candidateId: string;
  language: string;
  sourceCode: string;
}

let queueInstance: Queue<SubmissionJobData> | null = null;

export function getSubmissionQueue(): Queue<SubmissionJobData> | null {
  if (!queueInstance && isRedisConfigured) {
    const connection = createRedisConnection();
    if (connection) {
      try {
        queueInstance = new Queue<SubmissionJobData>('code-execution', {
          connection,
          defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 500,
            removeOnFail: 1000,
          },
        });
      } catch (err: any) {
        console.warn('⚠️ BullMQ Queue initialization notice:', err.message);
      }
    }
  }
  return queueInstance;
}

/**
 * Enqueues a submission for sandboxed execution (or logs if queue is offline).
 */
export async function enqueueSubmission(data: SubmissionJobData) {
  const queue = getSubmissionQueue();
  if (queue) {
    return queue.add('execute', data, {
      jobId: data.submissionId,
    });
  }
  console.log(`ℹ️ Submission ${data.submissionId} recorded (Worker queue offline / standalone mode).`);
  return { id: data.submissionId };
}
