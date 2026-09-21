'use client';

import Editor, { OnMount } from '@monaco-editor/react';
import { useRef } from 'react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ language, value, onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-neutral-800">
      <Editor
        height="100%"
        theme="vs-dark"
        language={mapLanguage(language)}
        value={value}
        onMount={(editor) => (editorRef.current = editor)}
        onChange={(val) => onChange(val ?? '')}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          // Disabling Monaco's own context menu is a UX nicety; it is not
          // the security boundary — ProctorTracker's DOM-level listeners
          // (and, ultimately, server-side grading) are.
          contextmenu: false,
        }}
      />
    </div>
  );
}

function mapLanguage(language: string): string {
  const map: Record<string, string> = {
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    JAVA: 'java',
    CPP: 'cpp',
    GO: 'go',
  };
  return map[language] ?? 'plaintext';
}
