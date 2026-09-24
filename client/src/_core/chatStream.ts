// Thin wrapper over the Server-Sent Events chat streams. The server begins
// every connection with a "sync" snapshot, then pushes per-item deltas:
//
//   streamRooms     -> sync { rooms } then "room" | "removed"
//   streamMessages  -> sync { roomId, messages } then "message" | "removed"
//
// Both also emit "error" when Firestore is unreachable and ": ping" keepalives
// which EventSource absorbs automatically.

export type ChatStreamHandlers = {
  onSync: (payload: unknown) => void;
  onEvent: (name: "room" | "removed" | "message", payload: unknown) => void;
  onConnectionChange?: (connected: boolean) => void;
};

/** Returns an unsubscribe function. Falls back to nothing when SSE is unsupported. */
export function subscribeChatStream(
  url: string,
  handlers: ChatStreamHandlers,
): () => void {
  if (typeof EventSource === "undefined") {
    handlers.onConnectionChange?.(false);
    return () => undefined;
  }

  const source = new EventSource(url);

  source.addEventListener("open", () => handlers.onConnectionChange?.(true));
  source.addEventListener("sync", (event) => {
    try {
      handlers.onSync(JSON.parse((event as MessageEvent).data));
    } catch {
      /* ignore malformed frames */
    }
  });
  for (const name of ["room", "removed", "message"] as const) {
    source.addEventListener(name, (event) => {
      try {
        handlers.onEvent(name, JSON.parse((event as MessageEvent).data));
      } catch {
        /* ignore malformed frames */
      }
    });
  }
  source.addEventListener("error", () => handlers.onConnectionChange?.(false));

  return () => source.close();
}
