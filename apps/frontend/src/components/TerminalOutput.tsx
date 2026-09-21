interface TerminalOutputProps {
  stdout?: string | null;
  stderr?: string | null;
  status: string;
}

export default function TerminalOutput({ stdout, stderr, status }: TerminalOutputProps) {
  return (
    <div className="h-full w-full overflow-auto rounded-lg bg-black p-3 font-mono text-sm text-neutral-200">
      <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Status: {status}</div>
      {stdout && <pre className="whitespace-pre-wrap text-green-400">{stdout}</pre>}
      {stderr && <pre className="whitespace-pre-wrap text-red-400">{stderr}</pre>}
      {!stdout && !stderr && <p className="text-neutral-600">Run your code to see output here.</p>}
    </div>
  );
}
