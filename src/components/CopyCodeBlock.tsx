import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CopyCodeBlockProps {
  label: string;
  command: string;
}

export function CopyCodeBlock({ label, command }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 px-3 py-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          {label}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600/20 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-600/30 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy Command'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-emerald-300">
        {command}
      </pre>
    </div>
  );
}
