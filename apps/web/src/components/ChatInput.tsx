import { useState } from 'react';

interface ChatInputProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onSend: (message: string) => void;
  onAbort?: () => void;
}

export function ChatInput({
  disabled,
  isStreaming,
  onSend,
  onAbort,
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="border-t border-white/10 bg-[#0f1528] p-4">
      <div className="mx-auto flex max-w-4xl gap-3">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={3}
          disabled={disabled}
          className="min-h-[88px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onAbort}
            className="h-fit rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-500"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="h-fit rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
