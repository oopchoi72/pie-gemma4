import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../api/client';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'border border-white/10 bg-white/5 text-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content || (message.streaming ? '…' : '')}</ReactMarkdown>
            {message.streaming ? (
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-indigo-300" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
