import {
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  Trash2,
  X,
  CheckCheck,
  FileText,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  ApiUnavailableError,
  type ChatMessage,
  type ChatRoom,
} from "@/_core/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { subscribeChatStream } from "@/_core/chatStream";

type DemoThread = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  lastSeen: string;
  messages: { from: "me" | "them"; text: string; time: string }[];
};

const learnerThreads: DemoThread[] = [
  {
    id: "sola",
    name: "Ms. Sola · maths coach",
    initials: "MS",
    tone: "bg-[#F28B78] text-[#5A2F22]",
    lastSeen: "online now",
    messages: [
      {
        from: "them",
        text: "Morning, Amira! You're 3 concepts from finishing Multiplication. Fancy a quick boost today?",
        time: "08:02",
      },
      {
        from: "me",
        text: "Morning Ms. Sola! Yes please — the 10s lesson felt much easier this morning.",
        time: "08:11",
      },
    ],
  },
  {
    id: "group",
    name: "JSS1 Blue · class group",
    initials: "JB",
    tone: "bg-[#8B78C7] text-white",
    lastSeen: "24 members",
    messages: [
      {
        from: "them",
        text: "Reminder: Friday's live class moves to Google Meet (link in Classroom). See you at 3pm!",
        time: "Yesterday",
      },
    ],
  },
];

const tutorThreads: DemoThread[] = [
  {
    id: "amara",
    name: "Amara Okafor",
    initials: "AO",
    tone: "bg-[#FFC857] text-[#1A1512]",
    lastSeen: "online now",
    messages: [
      {
        from: "them",
        text: "Hi Ms. Sola, I tried the fraction blocks again. I think I get it now!",
        time: "09:02",
      },
      {
        from: "me",
        text: "That's great, Amara — explain it back to me in your own words?",
        time: "09:10",
      },
    ],
  },
];

const REACTION_PRESETS = ["👍", "❤️", "😂", "😮", "🎉"];

function initialsFor(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = String(Math.round(seconds % 60)).padStart(2, "0");
  return `${minutes}:${rest}`;
}

/** Uppercase letters from the first word we can use as the avatar tone seed. */
function toneFor(name: string): string {
  const sum = Array.from(name).reduce(
    (acc, char) => acc + (char.charCodeAt(0) || 0),
    0,
  );
  const tones = [
    "bg-[#F28B78] text-[#5A2F22]",
    "bg-[#8B78C7] text-white",
    "bg-[#FFC857] text-[#1A1512]",
    "bg-[#8CAE70] text-white",
    "bg-[#5BA8A0] text-white",
  ];
  return tones[sum % tones.length];
}

export function Messages({ variant }: { variant: "learner" | "tutor" }) {
  const { user } = useAuth();
  const myId = user?.id ?? "";

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const demoThreads = variant === "tutor" ? tutorThreads : learnerThreads;
  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const refreshRooms = useCallback(async () => {
    try {
      const next = await api.listChatRooms();
      setRooms(next);
      setOffline(false);
    } catch (error) {
      if (error instanceof ApiUnavailableError) setOffline(true);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const refreshMessages = useCallback(async (roomId: string) => {
    try {
      setMessages(await api.listChatMessages(roomId));
    } catch {
      /* leave whatever is in state */
    }
  }, []);

  // Rooms stream.
  useEffect(() => {
    void refreshRooms();
    const unsubscribe = subscribeChatStream("/api/chat/streamRooms", {
      onSync: (payload) => {
        const data = payload as { rooms?: ChatRoom[] };
        if (Array.isArray(data.rooms)) setRooms(data.rooms);
      },
      onEvent: (name, payload) => {
        if (name === "room")
          setRooms((current) => upsertRoom(current, payload as ChatRoom));
        if (name === "removed") {
          const { roomId } = payload as { roomId?: string };
          if (roomId) {
            setRooms((current) => current.filter((room) => room.id !== roomId));
            setActiveRoomId((active) => (active === roomId ? null : active));
          }
        }
      },
      onConnectionChange: setConnected,
    });
    return unsubscribe;
  }, [refreshRooms]);

  // Active room: messages stream + mark read.
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    void refreshMessages(activeRoomId);
    const unsubscribe = subscribeChatStream(
      `/api/chat/streamMessages?roomId=${encodeURIComponent(activeRoomId)}`,
      {
        onSync: (payload) => {
          const data = payload as { messages?: ChatMessage[] };
          if (Array.isArray(data.messages)) setMessages(data.messages);
        },
        onEvent: (name, payload) => {
          if (name === "message")
            setMessages((current) =>
              upsertMessage(current, payload as ChatMessage),
            );
          if (name === "removed") {
            const { messageId } = payload as { messageId?: string };
            if (messageId)
              setMessages((current) =>
                current.filter((message) => message.id !== messageId),
              );
          }
        },
        onConnectionChange: setConnected,
      },
    );
    return unsubscribe;
  }, [activeRoomId, refreshMessages]);

  // Poll fallback when SSE can't connect (preview iframe headers, proxies, etc.).
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(() => {
      void refreshRooms();
      if (activeRoomId) void refreshMessages(activeRoomId);
    }, 6_000);
    return () => clearInterval(timer);
  }, [connected, activeRoomId, refreshRooms, refreshMessages]);

  // Mark read when the active room gains a message from someone else.
  useEffect(() => {
    if (!activeRoomId || !myId) return;
    const room = rooms.find((candidate) => candidate.id === activeRoomId);
    if (!room) return;
    const last = room.lastMessage;
    if (!last || last.senderName === meName(user)) return;
    if ((room.readAt?.[myId] ?? "") >= last.createdAt) return;
    api.markChatRoomRead(activeRoomId).catch(() => undefined);
  }, [rooms, activeRoomId, myId, user]);

  const openRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobileThreadOpen(true);
  };

  const sendText = async () => {
    const text = draft.trim();
    const target = activeRoomId;
    if (!text || !target || busy) return;
    setDraft("");
    const send: Promise<unknown> = api.sendChatMessage(target, {
      type: "text",
      text,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderName: replyTo.senderName,
            text: replyTo.text,
            type: replyTo.type,
          }
        : null,
    });
    setReplyTo(null);
    try {
      await send;
    } catch (error) {
      if (error instanceof ApiUnavailableError) setOffline(true);
    }
  };

  const sendMedia = async (file: File) => {
    const target = activeRoomId;
    if (!target || busy) return;
    setBusy(true);
    try {
      const isImage = file.type.startsWith("image/");
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      const uploaded = await api.uploadChatFile({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64: base64,
        type: isImage ? "image" : "file",
      });
      await api.sendChatMessage(target, {
        type: isImage ? "image" : "file",
        mediaUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderName: replyTo.senderName,
              text: replyTo.text,
              type: replyTo.type,
            }
          : null,
      });
      setReplyTo(null);
    } catch (error) {
      if (error instanceof ApiUnavailableError) setOffline(true);
      else
        toast.error(
          error instanceof Error ? error.message : "Could not send the file.",
        );
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!activeRoomId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await uploadVoice(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Voice messages need microphone permission.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const uploadVoice = async (blob: Blob) => {
    const target = activeRoomId;
    if (!target) return;
    setBusy(true);
    try {
      const mimeType = blob.type || "audio/webm";
      const base64 = await blobToBase64(blob);
      const uploaded = await api.uploadChatFile({
        fileName: "voice-message.webm",
        mimeType,
        dataBase64: base64,
        type: "voice",
      });
      const duration = await estimateAudioDuration(blob, mimeType);
      await api.sendChatMessage(target, {
        type: "voice",
        mediaUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        voiceDuration: duration,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderName: replyTo.senderName,
              text: replyTo.text,
              type: replyTo.type,
            }
          : null,
      });
      setReplyTo(null);
    } catch (error) {
      if (error instanceof ApiUnavailableError) setOffline(true);
      else toast.error("Could not send the voice message.");
    } finally {
      setBusy(false);
    }
  };

  const toggleReaction = (message: ChatMessage, emoji: string) => {
    if (!activeRoomId || message.deleted) return;
    setMessages((current) =>
      current.map((candidate) => {
        if (candidate.id !== message.id) return candidate;
        const reactions = { ...candidate.reactions };
        const currentIds = new Set(reactions[emoji] ?? []);
        if (currentIds.has(myId)) currentIds.delete(myId);
        else currentIds.add(myId);
        if (currentIds.size === 0) delete reactions[emoji];
        else reactions[emoji] = Array.from(currentIds);
        return { ...candidate, reactions };
      }),
    );
    api
      .reactToChatMessage(activeRoomId, message.id, emoji)
      .catch(() => undefined);
  };

  const removeMessage = (message: ChatMessage) => {
    if (!activeRoomId || (message.senderId !== myId && user?.role !== "admin"))
      return;
    setMessages((current) =>
      current.map((candidate) =>
        candidate.id === message.id
          ? {
              ...candidate,
              deleted: true,
              text: null,
              mediaUrl: null,
              fileName: null,
              reactions: {},
              replyTo: null,
            }
          : candidate,
      ),
    );
    api.deleteChatMessage(activeRoomId, message.id).catch(() => undefined);
  };

  const startChatWith = async (contactId: string) => {
    try {
      const room = await api.openChatRoom(contactId);
      setRooms((current) => upsertRoom(current, room));
      setActiveRoomId(room.id);
      setContactsOpen(false);
      setMobileThreadOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open that conversation.",
      );
    }
  };

  // ────────────────────────── demo fallback (offline preview) ──────────────────────────

  const demo = offline && rooms.length === 0;

  const threadList = (
    <div className="overflow-y-auto">
      {demo
        ? demoThreads.map((thread) => (
            <button
              key={thread.id}
              className="w-full rounded-2xl p-3 text-left transition hover:bg-[#F7EFE3]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${thread.tone}`}
                >
                  {thread.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[#3B241A]">
                      {thread.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#8A7361]">
                      {thread.messages[thread.messages.length - 1].time}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#8A7361]">
                    {thread.messages[thread.messages.length - 1].text}
                  </div>
                </div>
              </div>
            </button>
          ))
        : rooms
            .filter((room) => roomMatchesSearch(room, search))
            .map((room) => {
              const other = otherParticipant(room, myId);
              const otherName = other?.name.split("·")[0].trim() ?? "Message";
              const unread = isUnread(room, myId, user);
              const last = room.lastMessage;
              return (
                <button
                  key={room.id}
                  onClick={() => openRoom(room.id)}
                  className={`w-full rounded-2xl p-3 text-left transition ${room.id === activeRoomId ? "bg-[#EFEFDD]" : "hover:bg-[#F7EFE3]"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${toneFor(otherName)}`}
                    >
                      {initialsFor(otherName)}
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#FFFDF8] bg-[#C65A2E]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#3B241A]">
                          {otherName}
                        </span>
                        <span className="shrink-0 text-[10px] text-[#8A7361]">
                          {timeLabel(last?.createdAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#8A7361]">
                        {last
                          ? `${last.senderName === meName(user) ? "You: " : ""}${last.type === "voice" ? "🎤 Voice message" : last.text}`
                          : "Say hello 👋"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
      {rooms.length === 0 && !demo && !loadingRooms && (
        <div className="px-2 py-8 text-center text-xs leading-5 text-[#8A7361]">
          No conversations yet.
          <br />
          {variant === "tutor" &&
            "Reach out to a learner or colleague from the classroom."}
          {variant === "learner" &&
            "Your teachers and classmates will show up here."}
        </div>
      )}
    </div>
  );

  const threadView = demo ? (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[#F3E9DE] p-4">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${toneFor(demoThreads[0].name)}`}
        >
          {demoThreads[0].initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#3B241A]">
            {demoThreads[0].name}
          </div>
          <div className="mt-0.5 text-[11px] text-[#8A7361]">
            {demoThreads[0].lastSeen} · demo preview
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {demoThreads[0].messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${message.from === "me" ? "rounded-br-md bg-[#C65A2E] text-white" : "rounded-bl-md bg-[#F7EFE3] text-[#3B241A]"}`}
            >
              {message.text}
              <div
                className={`mt-1 text-right text-[10px] ${message.from === "me" ? "text-[#F3D9C8]" : "text-[#A08A75]"}`}
              >
                {message.time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-[#F3E9DE] p-3">
        <button className="rounded-xl p-2.5 text-[#8A7361] hover:bg-[#F7EFE3]">
          <Paperclip size={17} />
        </button>
        <input
          disabled
          placeholder="Live messaging needs the backend running…"
          className="min-w-0 flex-1 rounded-full border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm text-[#3B241A] outline-none"
        />
        <button className="rounded-xl bg-[#C65A2E]/40 p-2.5 text-white">
          <Send size={16} />
        </button>
      </div>
    </div>
  ) : activeRoom ? (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#F3E9DE] p-4">
        <button
          onClick={() => setMobileThreadOpen(false)}
          className="rounded-lg p-1.5 text-[#765F4F] hover:bg-[#F3E9DE] md:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${toneFor(otherParticipant(activeRoom, myId)?.name ?? "Chat")}`}
        >
          {initialsFor(otherParticipant(activeRoom, myId)?.name ?? "Chat")}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#3B241A]">
            {otherParticipant(activeRoom, myId)?.name ?? "Conversation"}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8A7361]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[#8CAE70]" : "bg-[#D9C0A6]"}`}
            />
            {connected
              ? "Live · messages update in real time"
              : "Reconnecting…"}
          </div>
        </div>
      </div>

      {/* Parent reply banner */}
      {replyTo && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#F7EFE3] px-3 py-2 text-xs">
          <span className="truncate text-[#765F4F]">
            Replying to{" "}
            <span className="font-semibold">{replyTo.senderName}</span>:{" "}
            {replyTo.deleted
              ? "deleted message"
              : (replyTo.text ??
                (replyTo.type === "voice"
                  ? "🎤 Voice message"
                  : "📎 Attachment"))}
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-[#A08A75] hover:text-[#3B241A]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="py-12 text-center text-xs leading-5 text-[#8A7361]">
            No messages yet — say hello! 👋
          </div>
        )}
        {messages
          .filter((message) =>
            search.trim()
              ? (message.text ?? "")
                  .toLowerCase()
                  .includes(search.trim().toLowerCase())
              : true,
          )
          .map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              myId={myId}
              mine={message.senderId === myId}
              canDelete={message.senderId === myId || user?.role === "admin"}
              onReply={() => {
                if (!message.deleted) setReplyTo(message);
              }}
              onReact={(emoji) => toggleReaction(message, emoji)}
              onDelete={() => removeMessage(message)}
            />
          ))}
        {search.trim() && messages.length > 0 && (
          <div className="text-center text-[10px] text-[#8A7361]">
            Showing matches for “{search}” ·{" "}
            <button onClick={() => setSearch("")} className="underline">
              clear search
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-[#F3E9DE] p-3">
        <label
          className="cursor-pointer rounded-xl p-2.5 text-[#8A7361] hover:bg-[#F7EFE3]"
          title="Attach a file"
        >
          <Paperclip size={17} />
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void sendMedia(file);
              event.target.value = "";
            }}
          />
        </label>
        <label
          className="cursor-pointer rounded-xl p-2.5 text-[#8A7361] hover:bg-[#F7EFE3]"
          title="Send an image"
        >
          <ImageIcon size={17} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void sendMedia(file);
              event.target.value = "";
            }}
          />
        </label>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) =>
            event.key === "Enter" &&
            !event.nativeEvent.isComposing &&
            void sendText()
          }
          placeholder={`Message ${otherParticipant(activeRoom, myId)?.name.split("·")[0].trim() ?? ""}…`}
          className="min-w-0 flex-1 rounded-full border border-[#E2CDB8] bg-[#FFFDF8] px-4 py-2.5 text-sm text-[#3B241A] outline-none focus:border-[#8CAE70]"
        />
        {recording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-xl bg-[#C65A2E] px-3 py-2.5 text-white hover:bg-[#A84A22]"
            title="Stop recording"
          >
            <Square size={14} fill="currentColor" /> Stop
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="rounded-xl p-2.5 text-[#8A7361] hover:bg-[#F7EFE3]"
            title="Send a voice message"
          >
            <Mic size={17} />
          </button>
        )}
        <button
          onClick={() => void sendText()}
          className="rounded-xl bg-[#C65A2E] p-2.5 text-white hover:bg-[#A84A22]"
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  ) : (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#EFEFDD] text-[#4B6B3C]">
          <CheckCheck size={28} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-[#1A1512]">
          Choose a conversation
        </h3>
        <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-5 text-[#8A7361]">
          Pick a chat on the left, or start a new one with a member of your
          learning community.
        </p>
        <button
          onClick={() => setContactsOpen(true)}
          className="mt-4 rounded-full bg-[#C65A2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A84A22]"
        >
          New message
        </button>
      </div>
    </div>
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
      {/* Conversations */}
      <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-4">
        <div className="px-2 pb-3 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7361]">
            Messages
          </div>
          <h2 className="mt-1 flex items-center justify-between font-display text-xl font-semibold tracking-[-0.05em] text-[#1A1512]">
            {variant === "tutor" ? "Inbox" : "Your conversations"}
            <button
              onClick={() => setContactsOpen(true)}
              className="flex items-center gap-1 rounded-full bg-[#C65A2E] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#A84A22]"
              title="New message"
            >
              <Plus size={12} /> New
            </button>
          </h2>
          <div className="relative mt-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08A75]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations or messages…"
              className="w-full rounded-full border border-[#E2CDB8] bg-[#FFFDF8] py-2 pl-9 pr-3 text-xs text-[#3B241A] outline-none focus:border-[#8CAE70]"
            />
          </div>
        </div>
        {threadList}
      </div>

      {/* Thread */}
      <div
        className={`rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] shadow-[0_12px_30px_rgba(55,33,22,.05)] md:h-[620px] ${mobileThreadOpen ? "block" : "hidden md:block"}`}
      >
        {threadView}
      </div>

      {/* Contact picker */}
      {contactsOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#1A1512]/50 p-4"
          onClick={() => setContactsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#1A1512]">
                New message
              </h3>
              <button
                onClick={() => setContactsOpen(false)}
                className="rounded-lg p-1.5 text-[#765F4F] hover:bg-[#F7EFE3]"
              >
                <X size={16} />
              </button>
            </div>
            <ContactPicker
              onPick={startChatWith}
              onClose={() => setContactsOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ────────────────────────── sub-components ──────────────────────────

function MessageBubble({
  message,
  myId,
  mine,
  canDelete,
  onReply,
  onReact,
  onDelete,
}: {
  message: ChatMessage;
  myId: string;
  mine: boolean;
  canDelete: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}) {
  const [reactionsOpen, setReactionsOpen] = useState(false);

  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}
      >
        {message.replyTo && (
          <div
            className={`mb-1 max-w-[260px] truncate rounded-lg px-2.5 py-1 text-[10px] leading-4 ${mine ? "bg-[#C65A2E]/20 text-[#7A3A1D]" : "bg-[#E9EED9] text-[#4B6B3C]"}`}
          >
            ↳ {message.replyTo.senderName}:{" "}
            {message.replyTo.text ??
              (message.replyTo.type === "voice"
                ? "🎤 Voice message"
                : "📎 Attachment")}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${mine ? "rounded-br-md bg-[#C65A2E] text-white" : "rounded-bl-md bg-[#F7EFE3] text-[#3B241A]"}`}
        >
          {message.deleted ? (
            <span
              className={
                mine ? "text-[#F3D9C8] italic" : "text-[#A08A75] italic"
              }
            >
              Message deleted
            </span>
          ) : message.type === "image" ? (
            <a href={message.mediaUrl ?? "#"} target="_blank" rel="noreferrer">
              <img
                src={message.mediaUrl ?? ""}
                alt={message.fileName ?? "Image"}
                className="max-h-64 rounded-xl object-cover"
              />
            </a>
          ) : message.type === "voice" ? (
            <div className="flex min-w-0 items-center gap-3">
              <audio
                src={message.mediaUrl ?? ""}
                preload="metadata"
                className="w-full max-w-[200px]"
                controls
              />
              <span
                className={`shrink-0 text-[10px] ${mine ? "text-[#F3D9C8]" : "text-[#A08A75]"}`}
              >
                {formatDuration(message.voiceDuration)}
              </span>
            </div>
          ) : message.type === "file" ? (
            <a
              href={message.mediaUrl ?? "#"}
              download={message.fileName ?? undefined}
              className={`flex items-center gap-2.5 ${mine ? "text-[#FFF3EA] underline" : "text-[#4B6B3C] underline"}`}
            >
              <FileText size={16} />
              <span className="max-w-[220px] truncate">
                {message.fileName ?? "Attachment"}
              </span>
            </a>
          ) : (
            <span className="whitespace-pre-wrap break-words">
              {message.text ?? ""}
            </span>
          )}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-[#F3D9C8]" : "text-[#A08A75]"}`}
          >
            {timeLabel(message.createdAt)}
          </div>
        </div>

        {/* Reactions row */}
        {Object.keys(message.reactions).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reactions).map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${ids.includes(myId) ? "border-[#C65A2E] bg-[#C65A2E]/10" : "border-[#E2CDB8] bg-[#FFFDF8]"}`}
                title={`${ids.length} reaction${ids.length === 1 ? "" : "s"}`}
              >
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}

        {/* Hover actions */}
        {!message.deleted && (
          <div
            className={`mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 ${mine ? "justify-end" : "justify-start"}`}
          >
            <button
              onClick={() => setReactionsOpen((open) => !open)}
              className="rounded-lg p-1 text-[#8A7361] hover:bg-[#F7EFE3]"
              title="React"
            >
              <Smile size={13} />
            </button>
            <button
              onClick={onReply}
              className="rounded-lg p-1 text-[#8A7361] hover:bg-[#F7EFE3]"
              title="Reply"
            >
              <ArrowLeft size={13} className="rotate-180" />
            </button>
            {canDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg p-1 text-[#8A7361] hover:bg-[#F3E9DE]"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
        {reactionsOpen && (
          <div className="mt-1 flex gap-1 rounded-full border border-[#E2CDB8] bg-[#FFFDF8] px-2 py-1 shadow-sm">
            {REACTION_PRESETS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setReactionsOpen(false);
                }}
                className="rounded-full p-1 text-sm hover:bg-[#F7EFE3]"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactPicker({
  onPick,
  onClose,
}: {
  onPick: (contactId: string) => void;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .listChatContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  const filtered = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mt-4">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A08A75]"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="Search members…"
          className="w-full rounded-full border border-[#E2CDB8] bg-[#FFFDF8] py-2 pl-9 pr-3 text-sm text-[#3B241A] outline-none focus:border-[#8CAE70]"
        />
      </div>
      <div className="mt-3 max-h-[300px] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-[#8A7361]">
            No members found.
          </div>
        )}
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onPick(contact.id)}
            className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-[#F7EFE3]"
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${toneFor(contact.name)}`}
            >
              {initialsFor(contact.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#3B241A]">
                {contact.name}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[#A08A75]">
                {contact.role}
              </div>
            </div>
            <Phone size={14} className="text-[#A08A75]" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────── helpers ──────────────────────────

function upsertRoom(current: ChatRoom[], room: ChatRoom): ChatRoom[] {
  const rest = current.filter((candidate) => candidate.id !== room.id);
  return [room, ...rest].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

function upsertMessage(
  current: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  const exists = current.some((candidate) => candidate.id === message.id);
  const next = exists
    ? current.map((candidate) =>
        candidate.id === message.id ? message : candidate,
      )
    : [...current, message];
  return next.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

function otherParticipant(
  room: ChatRoom,
  myId: string,
): { openId: string; name: string } | undefined {
  return room.participants.find((participant) => participant.openId !== myId);
}

function meName(user: { id: string; name: string | null } | null): string {
  return user?.name ?? "";
}

function isUnread(
  room: ChatRoom,
  myId: string,
  user: { id: string; name: string | null } | null,
): boolean {
  const last = room.lastMessage;
  if (!last) return false;
  const readAt = room.readAt?.[myId] ?? "";
  return last.createdAt > readAt && last.senderName !== meName(user);
}

function roomMatchesSearch(room: ChatRoom, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const names = room.participants
    .map((participant) => participant.name.toLowerCase())
    .join(" ");
  return (
    names.includes(needle) ||
    (room.lastMessage?.text ?? "").toLowerCase().includes(needle)
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function estimateAudioDuration(blob: Blob, mimeType: string): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      cleanup();
      resolve(Math.round(duration));
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
  });
}
