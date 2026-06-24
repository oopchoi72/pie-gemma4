import { useEffect, useState } from 'react';
import { fetchHealth } from './api/client';
import { ChatWindow } from './components/ChatWindow';
import { SessionSidebar } from './components/SessionSidebar';
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';

export default function App() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    error: sessionError,
    create,
    remove,
  } = useSessions();

  const [health, setHealth] = useState<{ mode: string; model: string } | null>(
    null,
  );

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const { messages, isStreaming, error, toolRuns, sendMessage, abort } =
    useChat(activeSessionId);

  useEffect(() => {
    void fetchHealth()
      .then((data) => setHealth({ mode: data.mode, model: data.model }))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!loading && !activeSessionId) {
      void create();
    }
  }, [activeSessionId, create, loading]);

  return (
    <div className="flex h-full">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={loading}
        onSelect={setActiveSessionId}
        onCreate={() => void create()}
        onDelete={(sessionId) => void remove(sessionId)}
      />

      {activeSession ? (
        <ChatWindow
          title={activeSession.name}
          mode={health?.mode ?? activeSession.mode}
          model={health?.model ?? 'ollama/gemma'}
          messages={messages}
          toolRuns={toolRuns}
          error={sessionError ?? error}
          isStreaming={isStreaming}
          disabled={!activeSessionId}
          onSend={(message, images) => void sendMessage(message, images)}
          onAbort={() => void abort()}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          세션을 준비하는 중…
        </div>
      )}
    </div>
  );
}
