import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage, ModelInfo, OutgoingChatImage, ToolRun } from '../api/client';
import { ToolTimeline } from './ToolTimeline';

interface ChatWindowProps {
  title: string;
  mode: string;
  models: ModelInfo[];
  model: string;
  messages: ChatMessage[];
  toolRuns: ToolRun[];
  error: string | null;
  isStreaming: boolean;
  disabled?: boolean;
  onModelChange: (modelId: string) => void;
  onSend: (message: string, images: OutgoingChatImage[]) => void;
  onAbort: () => void;
}

function modelLabel(models: ModelInfo[], modelId: string): string {
  const match = models.find((entry) => entry.id === modelId);
  if (match) return match.name;
  return modelId;
}

export function ChatWindow({
  title,
  mode,
  models,
  model,
  messages,
  toolRuns,
  error,
  isStreaming,
  disabled,
  onModelChange,
  onSend,
  onAbort,
}: ChatWindowProps) {
  const current = models.find((entry) => entry.id === model);
  const supportsVision = current?.input.includes('image') ?? false;

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="model-select">
              모델 선택
            </label>
            <select
              id="model-select"
              className="max-w-full rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-gray-200 outline-none focus:border-sky-500/60 disabled:cursor-not-allowed disabled:opacity-50"
              value={model}
              disabled={isStreaming || models.length === 0}
              onChange={(event) => onModelChange(event.target.value)}
            >
              {models.length === 0 ? (
                <option value={model}>{modelLabel(models, model)}</option>
              ) : (
                models.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.input.includes('image') ? ' · vision' : ''}
                  </option>
                ))
              )}
            </select>
            {!supportsVision ? (
              <span className="text-[11px] text-amber-300/80">text only</span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
          {mode}
        </span>
      </header>

      {error ? (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <ToolTimeline runs={toolRuns} />
      <MessageList messages={messages} />
      <ChatInput
        disabled={disabled}
        isStreaming={isStreaming}
        onSend={(message, images) => void onSend(message, images)}
        onAbort={onAbort}
      />
    </section>
  );
}
