import axios from 'axios';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

/** Judge0 `language_id` values for the languages this platform supports. */
export const LANGUAGE_IDS: Record<string, number> = {
  JAVASCRIPT: 63, // Node.js
  TYPESCRIPT: 74,
  PYTHON: 71,
  JAVA: 62,
  CPP: 54,
  GO: 60,
};

/** Judge0 status.id === 3 means "Accepted" (i.e. ran to completion, no error). */
export const JUDGE0_ACCEPTED_STATUS_ID = 3;

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

/**
 * Submits one (source, stdin) pair to Judge0 and waits synchronously for the
 * verdict. The hard CPU-time and memory limits are enforced by Judge0's own
 * `isolate`-based sandbox on its side, not by this calling process — so a
 * malicious or runaway submission cannot exceed them no matter what the
 * client sends. This service is a thin, typed wrapper around that contract;
 * swap its internals for a direct Docker-based executor without touching
 * any caller code, as long as the same shape is returned.
 */
export async function runInSandbox(params: {
  languageId: number;
  sourceCode: string;
  stdin: string;
  cpuTimeLimitSec?: number;
  memoryLimitKb?: number;
}): Promise<Judge0Result> {
  const { languageId, sourceCode, stdin, cpuTimeLimitSec = 3, memoryLimitKb = 256_000 } = params;

  const { data } = await axios.post<Judge0Result>(
    `${JUDGE0_API_URL}/submissions`,
    {
      language_id: languageId,
      source_code: Buffer.from(sourceCode).toString('base64'),
      stdin: Buffer.from(stdin).toString('base64'),
      cpu_time_limit: cpuTimeLimitSec,
      memory_limit: memoryLimitKb,
      enable_network: false,
    },
    {
      params: { base64_encoded: 'true', wait: 'true' },
      headers: JUDGE0_API_KEY ? { 'X-RapidAPI-Key': JUDGE0_API_KEY } : undefined,
      // A little slack over the sandbox's own timeout so we don't abort the
      // HTTP call right as Judge0 is about to return the verdict.
      timeout: (cpuTimeLimitSec + 5) * 1000,
    }
  );

  return {
    ...data,
    stdout: data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf-8') : null,
    stderr: data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf-8') : null,
    compile_output: data.compile_output
      ? Buffer.from(data.compile_output, 'base64').toString('utf-8')
      : null,
  };
}
