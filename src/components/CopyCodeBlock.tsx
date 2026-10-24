import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyCodeBlockProps {
  title: string;
  language?: string;
  code: string;
}

export function CopyCodeBlock({ title, language = 'powershell', code }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-[#191919]">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3.5 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{title}</span>
          <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
