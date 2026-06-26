import { useEffect, useState } from 'react';
import {
  fetchHealth,
  fetchModels,
  type ModelInfo,
} from './api/client';
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
    updateModel,
  } = useSessions();

  const [health, setHealth] = useState<{
    mode: string;
    defaultModel: string;
  } | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const { messages, isStreaming, error, toolRuns, sendMessage, abort } =
    useChat(activeSessionId);

  useEffect(() => {
    void fetchHealth()
      .then((data) =>
        setHealth({ mode: data.mode, defaultModel: data.defaultModel }),
      )
      .catch(() => setHealth(null));

    void fetchModels()
      .then((data) => {
        setModels(data.models);
        setModelError(null);
      })
      .catch((err) => {
        setModels([]);
        setModelError(
          err instanceof Error ? err.message : 'Failed to load models',
        );
      });
  }, []);

  useEffect(() => {
    if (!loading && !activeSessionId) {
      void create(health?.defaultModel);
    }
  }, [activeSessionId, create, health?.defaultModel, loading]);

  const handleCreateSession = () => {
    const model = activeSession?.model ?? health?.defaultModel;
    void create(model);
  };

  const handleModelChange = (modelId: string) => {
    if (!activeSessionId || !activeSession || activeSession.model === modelId) {
      return;
    }
    void updateModel(activeSessionId, modelId).catch((err) => {
      setModelError(err instanceof Error ? err.message : 'Failed to change model');
    });
  };

  return (
    <div className="flex h-full">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={loading}
        onSelect={setActiveSessionId}
        onCreate={handleCreateSession}
        onDelete={(sessionId) => void remove(sessionId)}
      />

      {activeSession ? (
        <ChatWindow
          title={activeSession.name}
          mode={health?.mode ?? activeSession.mode}
          models={models}
          model={activeSession.model}
          messages={messages}
          toolRuns={toolRuns}
          error={sessionError ?? modelError ?? error}
          isStreaming={isStreaming}
          disabled={!activeSessionId}
          onModelChange={handleModelChange}
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
