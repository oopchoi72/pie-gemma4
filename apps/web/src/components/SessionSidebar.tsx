import type { SessionMeta } from '../api/client';

interface SessionSidebarProps {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  loading?: boolean;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: SessionSidebarProps) {
  return (
    <aside className="flex w-72 flex-col border-r border-white/10 bg-[#0d1224]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-white">pie-gemma4</p>
          <p className="text-xs text-gray-400">Gemma chat</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-3 text-xs text-gray-400">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-gray-400">대화가 없습니다.</p>
        ) : (
          sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 ${
                  active ? 'bg-indigo-600/20 text-white' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm">{session.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    {session.mode}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(session.id)}
                  className="text-xs text-gray-500 hover:text-rose-400"
                  aria-label="Delete session"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
