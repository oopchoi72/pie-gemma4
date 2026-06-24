export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
  mode: 'chat' | 'agent';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  streaming?: boolean;
}

export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'reset' }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string; isError: boolean }
  | { type: 'error'; message: string }
  | { type: 'done' };

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function fetchHealth() {
  return parseJson<{ ok: boolean; mode: string; model: string }>(
    await fetch('/api/health'),
  );
}

export async function listSessions() {
  const data = await parseJson<{ sessions: SessionMeta[] }>(
    await fetch('/api/sessions'),
  );
  return data.sessions;
}

export async function createSession(name?: string) {
  return parseJson<SessionMeta>(
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function fetchMessages(sessionId: string) {
  const data = await parseJson<{ messages: ChatMessage[] }>(
    await fetch(`/api/sessions/${sessionId}/messages`),
  );
  return data.messages;
}

export async function deleteSession(sessionId: string) {
  await parseJson<{ ok: boolean }>(
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
  );
}

export async function abortSession(sessionId: string) {
  await parseJson<{ ok: boolean }>(
    await fetch(`/api/sessions/${sessionId}/abort`, { method: 'POST' }),
  );
}

export async function streamChat(
  sessionId: string,
  message: string,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Chat failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Streaming body missing');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf('\n\n');
      if (newlineIndex === -1) break;

      const chunk = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 2);

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = JSON.parse(line.slice(6)) as SseEvent;
        onEvent(payload);
      }
    }
  }
}
