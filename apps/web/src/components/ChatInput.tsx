import { useRef, useState, type ClipboardEvent } from 'react';
import type { OutgoingChatImage } from '../api/client';
import {
  fileToPendingImage,
  limitAttachments,
  readClipboardImages,
  type PendingImage,
} from '../utils/images';

interface ChatInputProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onSend: (message: string, images: OutgoingChatImage[]) => void;
  onAbort?: () => void;
}

export function ChatInput({
  disabled,
  isStreaming,
  onSend,
  onAbort,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<PendingImage[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = (event: ClipboardEvent) => {
    const files = readClipboardImages(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  };

  const canSend =
    !disabled && (value.trim().length > 0 || attachments.length > 0);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setAttachError(null);
    try {
      const pending = await Promise.all(files.map((file) => fileToPendingImage(file)));
      setAttachments((prev) => limitAttachments(prev, pending));
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : '이미지 첨부 실패');
    }
  };

  const submit = () => {
    if (!canSend || isStreaming) return;
    onSend(
      value.trim(),
      attachments.map((image) => ({
        data: image.data,
        mimeType: image.mimeType,
      })),
    );
    setValue('');
    setAttachments([]);
    setAttachError(null);
  };

  return (
    <div
      className="border-t border-white/10 bg-[#0f1528] p-4"
      onPaste={handlePaste}
    >
      <div className="mx-auto max-w-4xl space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            const selected = [...(event.target.files ?? [])];
            event.target.value = '';
            void addFiles(selected);
          }}
        />
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachments.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.previewUrl}
                  alt="첨부 이미지"
                  className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((entry) => entry.id !== image.id),
                    )
                  }
                  className="absolute -right-2 -top-2 rounded-full bg-rose-600 px-1.5 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {attachError ? (
          <p className="text-xs text-rose-300">{attachError}</p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="이미지 첨부"
            className="h-fit rounded-xl border border-white/10 px-3 py-3 text-sm text-gray-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🖼
          </button>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈, 붙여넣기/🖼 이미지 첨부)"
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
              disabled={!canSend}
              className="h-fit rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
