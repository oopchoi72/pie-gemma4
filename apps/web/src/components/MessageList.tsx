import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../api/client';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          프롬프트를 입력하면 pie가 답변합니다.
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
