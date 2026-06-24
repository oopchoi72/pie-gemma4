import type { AgentSession } from '@pie-lab/coding-agent';
import { randomUUID } from 'node:crypto';
import { createChatSession } from './factory.js';
import type { PieMode } from '../config.js';

interface TextPart {
  type: 'text';
  text: string;
}

type MessageLike = {
  role: string;
  content: string | TextPart[];
  timestamp: number;
};

export interface ChatSessionMeta {
  id: string;
  name: string;
  createdAt: string;
  mode: PieMode;
}

export interface StoredSession {
  meta: ChatSessionMeta;
  session: AgentSession;
  isStreaming: boolean;
}

function extractText(message: MessageLike): string {
  if (message.role === 'user') {
    if (typeof message.content === 'string') return message.content;
    return message.content
      .filter((part): part is TextPart => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }

  if (!Array.isArray(message.content)) {
    return '';
  }

  return message.content
    .filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export class SessionPool {
  private sessions = new Map<string, StoredSession>();
  private defaultMode: PieMode;

  constructor(defaultMode: PieMode) {
    this.defaultMode = defaultMode;
  }

  list(): ChatSessionMeta[] {
    return [...this.sessions.values()]
      .map((entry) => entry.meta)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): StoredSession | undefined {
    return this.sessions.get(id);
  }

  async create(name?: string, mode?: PieMode): Promise<ChatSessionMeta> {
    const sessionMode = mode ?? this.defaultMode;
    const session = await createChatSession(sessionMode);
    const meta: ChatSessionMeta = {
      id: randomUUID(),
      name: name?.trim() || `Chat ${this.sessions.size + 1}`,
      createdAt: new Date().toISOString(),
      mode: sessionMode,
    };

    this.sessions.set(meta.id, {
      meta,
      session,
      isStreaming: false,
    });

    return meta;
  }

  getMessages(id: string) {
    const entry = this.require(id);
    return entry.session.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: `${message.timestamp}-${message.role}`,
        role: message.role as 'user' | 'assistant',
        content: extractText(message as MessageLike),
        timestamp: message.timestamp,
      }))
      .filter((message) => message.content.length > 0);
  }

  setStreaming(id: string, isStreaming: boolean) {
    const entry = this.require(id);
    entry.isStreaming = isStreaming;
  }

  remove(id: string): boolean {
    const entry = this.sessions.get(id);
    if (!entry) return false;
    entry.session.dispose();
    this.sessions.delete(id);
    return true;
  }

  require(id: string): StoredSession {
    const entry = this.sessions.get(id);
    if (!entry) {
      throw new SessionNotFoundError(id);
    }
    return entry;
  }
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = 'SessionNotFoundError';
  }
}
