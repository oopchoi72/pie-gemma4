import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../api/client';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'border border-white/10 bg-white/5 text-gray-100'
        }`}
      >
        {isUser ? (
          <div className="space-y-2">
            {message.images?.map((image, index) => (
              <img
                key={`${message.id}-image-${index}`}
                src={image.dataUrl}
                alt="첨부 이미지"
                className="max-h-64 rounded-lg border border-white/20 object-contain"
              />
            ))}
            {message.content ? (
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {message.content}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none break-words [overflow-wrap:anywhere]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.streaming ? '…' : '')}
            </ReactMarkdown>
            {message.streaming ? (
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-indigo-300" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
