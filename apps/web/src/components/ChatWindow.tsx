import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage, ToolRun } from '../api/client';
import { ToolTimeline } from './ToolTimeline';

interface ChatWindowProps {
  title: string;
  mode: string;
  model: string;
  messages: ChatMessage[];
  toolRuns: ToolRun[];
  error: string | null;
  isStreaming: boolean;
  disabled?: boolean;
  onSend: (message: string) => void;
  onAbort: () => void;
}

export function ChatWindow({
  title,
  mode,
  model,
  messages,
  toolRuns,
  error,
  isStreaming,
  disabled,
  onSend,
  onAbort,
}: ChatWindowProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="text-xs text-gray-400">{model}</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
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
        onSend={onSend}
        onAbort={onAbort}
      />
    </section>
  );
}
