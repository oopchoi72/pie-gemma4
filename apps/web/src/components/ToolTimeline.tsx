export interface ToolRun {
  id: string;
  toolName: string;
  args?: string;
  status: 'running' | 'done' | 'error';
  preview?: string;
}

interface ToolTimelineProps {
  runs: ToolRun[];
}

export function ToolTimeline({ runs }: ToolTimelineProps) {
  if (runs.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-white/10 bg-black/20 px-6 py-3">
      {runs.map((run) => (
        <div
          key={run.id}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300"
        >
          <div className="flex items-center gap-2">
            <span
              className={
                run.status === 'running'
                  ? 'text-amber-300'
                  : run.status === 'error'
                    ? 'text-rose-300'
                    : 'text-emerald-300'
              }
            >
              {run.status === 'running'
                ? '▶'
                : run.status === 'error'
                  ? '✗'
                  : '✓'}
            </span>
            <span className="font-medium text-white">{run.toolName}</span>
            {run.args ? (
              <span className="truncate text-gray-400">{run.args}</span>
            ) : null}
          </div>
          {run.preview ? (
            <p className="mt-1 whitespace-pre-wrap text-gray-400">{run.preview}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
