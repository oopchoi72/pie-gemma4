import { useCallback, useEffect, useState } from 'react';
import {
  createSession,
  deleteSession,
  listSessions,
  updateSessionModel,
  type SessionMeta,
} from '../api/client';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listSessions();
      setSessions(next);
      setActiveSessionId((current) => {
        if (current && next.some((session) => session.id === current)) {
          return current;
        }
        return next[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (model?: string) => {
    const session = await createSession(undefined, model);
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const updateModel = useCallback(async (sessionId: string, model: string) => {
    const updated = await updateSessionModel(sessionId, model);
    setSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? updated : session)),
    );
    return updated;
  }, []);

  const remove = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      setActiveSessionId((current) =>
        current === sessionId ? null : current,
      );
    },
    [],
  );

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    error,
    refresh,
    create,
    remove,
    updateModel,
  };
}
