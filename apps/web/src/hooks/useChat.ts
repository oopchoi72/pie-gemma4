import { useCallback, useEffect, useRef, useState } from 'react';
import {
  abortSession,
  fetchMessages,
  streamChat,
  type ChatMessage,
  type OutgoingChatImage,
  type SseEvent,
  type ToolRun,
} from '../api/client';

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setError(null);

    void fetchMessages(sessionId)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string, images: OutgoingChatImage[] = []) => {
      if (!sessionId || isStreaming) return;
      if (!text.trim() && images.length === 0) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        images:
          images.length > 0
            ? images.map((image) => ({
                mimeType: image.mimeType,
                dataUrl: `data:${image.mimeType};base64,${image.data}`,
              }))
            : undefined,
      };
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setToolRuns([]);
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const handleEvent = (event: SseEvent) => {
        if (event.type === 'delta') {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + event.text }
                : message,
            ),
          );
          return;
        }

        if (event.type === 'reset') {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: '', streaming: true }
                : message,
            ),
          );
          return;
        }

        if (event.type === 'tool_start') {
          setToolRuns((prev) => [
            ...prev,
            {
              id: `${event.toolName}-${Date.now()}-${prev.length}`,
              toolName: event.toolName,
              args: event.args,
              status: 'running',
            },
          ]);
          return;
        }

        if (event.type === 'tool_update') {
          setToolRuns((prev) => {
            const index = [...prev]
              .reverse()
              .find((run) => run.toolName === event.toolName && run.status === 'running')
              ?.id;
            if (!index) return prev;
            return prev.map((run) =>
              run.id === index ? { ...run, preview: event.preview } : run,
            );
          });
          return;
        }

        if (event.type === 'tool_end') {
          setToolRuns((prev) => {
            const lastRunning = [...prev]
              .reverse()
              .find((run) => run.toolName === event.toolName && run.status === 'running');
            if (!lastRunning) return prev;
            return prev.map((run) =>
              run.id === lastRunning.id
                ? {
                    ...run,
                    status: event.isError ? 'error' : 'done',
                    preview: event.preview ?? run.preview,
                  }
                : run,
            );
          });
          return;
        }

        if (event.type === 'error') {
          setError(event.message);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: event.message, streaming: false }
                : message,
            ),
          );
          return;
        }

        if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, streaming: false }
                : message,
            ),
          );
        }
      };

      try {
        await streamChat(
          sessionId,
          text.trim(),
          images,
          handleEvent,
          controller.signal,
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Chat failed');
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, streaming: false }
              : message,
          ),
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, sessionId],
  );

  const abort = useCallback(async () => {
    abortRef.current?.abort();
    if (sessionId) {
      try {
        await abortSession(sessionId);
      } catch {
        // ignore abort errors
      }
    }
    setIsStreaming(false);
  }, [sessionId]);

  return {
    messages,
    isStreaming,
    error,
    toolRuns,
    sendMessage,
    abort,
  };
}
