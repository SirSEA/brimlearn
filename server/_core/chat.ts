// Real-time internal messaging: Firestore-backed rooms/messages plus the two
// Server-Sent Events streams the browser subscribes to.
//
//   GET /api/chat/streamRooms                 -> all rooms the caller is in
//   GET /api/chat/streamMessages?roomId=...   -> one room's message log
//   POST /api/chat/upload                     -> base64 upload -> /uploads/...
//
// All writes go through the tRPC `chat` router in ../routers.ts; these routes
// only observe and serve files. Subscriptions start with a full "sync" event so
// a late/reattaching client always lands on a consistent snapshot.
import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import type {
  ChatContact,
  ChatMessage,
  ChatMessageType,
  ChatRoom,
  ChatRoomParticipant,
  CreateChatMessageInput,
} from "@shared/chat";
import { ENV } from "./env";
import { getFirestoreDb } from "./firebase";
import { sdk } from "./sdk";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";
const USERS_COLLECTION = "users";

const DIRECT_ROOM_MAX = 500;
const STREAM_MESSAGE_LIMIT = 500;

// ────────────────────────────── helpers ──────────────────────────────

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const maybe = value as { toDate?: () => Date; seconds?: number };
  if (maybe && typeof maybe.toDate === "function")
    return maybe.toDate().toISOString();
  if (maybe && typeof maybe.seconds === "number")
    return new Date(maybe.seconds * 1000).toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

/** Deterministic id for a direct room so "open" is idempotent. */
export function roomIdFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function requireDb() {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured — set FIREBASE_SERVICE_ACCOUNT_PATH in .env",
    );
  }
  return getFirestoreDb();
}

function toRoom(id: string, data: DocumentData): ChatRoom {
  return {
    id,
    participants: (data.participants ?? []) as ChatRoomParticipant[],
    lastMessage: (data.lastMessage ?? null) as ChatRoom["lastMessage"],
    readAt: (data.readAt ?? {}) as ChatRoom["readAt"],
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

function toMessage(
  id: string,
  roomId: string,
  data: DocumentData,
): ChatMessage {
  return {
    id,
    roomId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    type: (data.type ?? "text") as ChatMessageType,
    text: (data.text ?? null) as string | null,
    mediaUrl: (data.mediaUrl ?? null) as string | null,
    fileName: (data.fileName ?? null) as string | null,
    fileSize: (data.fileSize ?? null) as number | null,
    voiceDuration: (data.voiceDuration ?? null) as number | null,
    replyTo: (data.replyTo ?? null) as ChatMessage["replyTo"],
    reactions: (data.reactions ?? {}) as ChatMessage["reactions"],
    deleted: Boolean(data.deleted),
    deletedBy: (data.deletedBy ?? null) as string | null,
    createdAt: iso(data.createdAt),
  };
}

async function assertRoomMember(
  roomId: string,
  openId: string,
): Promise<DocumentSnapshot<DocumentData>> {
  const db = requireDb();
  const room = await db.collection(CHATS_COLLECTION).doc(roomId).get();
  const participantIds = (room.data()?.participantIds ?? []) as string[];
  if (!room.exists || !participantIds.includes(openId)) {
    throw new Error("You are not a member of this conversation.");
  }
  return room;
}

// ──────────────────────────── data layer ────────────────────────────

/** Opens (or finds) the direct room between two users. */
export async function getOrCreateDirectRoom(
  current: { openId: string; name: string | null },
  other: { openId: string; name: string | null },
): Promise<ChatRoom> {
  const db = requireDb();
  const roomId = roomIdFor(current.openId, other.openId);
  const ref = db.collection(CHATS_COLLECTION).doc(roomId);
  const snapshot = await ref.get();

  const participants: ChatRoomParticipant[] = [
    { openId: current.openId, name: current.name ?? "Me" },
    { openId: other.openId, name: other.name ?? "Member" },
  ].filter(
    (p, index, all) => all.findIndex((x) => x.openId === p.openId) === index,
  );

  if (!snapshot.exists) {
    const now = new Date();
    await ref.set(
      {
        participantIds: [current.openId, other.openId],
        participants,
        lastMessage: null,
        readAt: {
          [current.openId]: now.toISOString(),
          [other.openId]: now.toISOString(),
        },
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  const fresh = await ref.get();
  return toRoom(roomId, fresh.data() ?? {});
}

export async function getRoom(roomId: string): Promise<ChatRoom | undefined> {
  const db = requireDb();
  const snapshot = await db.collection(CHATS_COLLECTION).doc(roomId).get();
  if (!snapshot.exists) return undefined;
  return toRoom(snapshot.id, snapshot.data() ?? {});
}

export async function listRoomsForUser(openId: string): Promise<ChatRoom[]> {
  const db = requireDb();
  const snapshot = await db
    .collection(CHATS_COLLECTION)
    .where("participantIds", "array-contains", openId)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();
  return snapshot.docs.map((doc) => toRoom(doc.id, doc.data()));
}

export async function listMessages(roomId: string): Promise<ChatMessage[]> {
  const db = requireDb();
  const snapshot = await db
    .collection(CHATS_COLLECTION)
    .doc(roomId)
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy("createdAt", "asc")
    .limit(STREAM_MESSAGE_LIMIT)
    .get();
  return snapshot.docs.map((doc) => toMessage(doc.id, roomId, doc.data()));
}

export async function appendMessage(
  roomId: string,
  sender: { openId: string; name: string | null },
  input: CreateChatMessageInput,
): Promise<ChatMessage> {
  const db = requireDb();
  await assertRoomMember(roomId, sender.openId);

  const now = new Date();
  const messageRef = db
    .collection(CHATS_COLLECTION)
    .doc(roomId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc();
  const payload = {
    roomId,
    senderId: sender.openId,
    senderName: sender.name ?? "Member",
    type: input.type,
    text: input.text?.trim() || null,
    mediaUrl: input.mediaUrl ?? null,
    fileName: input.fileName ?? null,
    fileSize: input.fileSize ?? null,
    voiceDuration: input.voiceDuration ?? null,
    replyTo: input.replyTo ?? null,
    reactions: {},
    deleted: false,
    deletedBy: null,
    createdAt: now,
  };
  await messageRef.set(payload);

  const preview =
    payload.text ??
    (input.type === "image"
      ? "📷 Image"
      : input.type === "voice"
        ? "🎤 Voice message"
        : (input.fileName ?? "📎 Attachment"));
  await db
    .collection(CHATS_COLLECTION)
    .doc(roomId)
    .set(
      {
        lastMessage: {
          text: preview.slice(0, DIRECT_ROOM_MAX),
          senderName: payload.senderName,
          type: input.type,
          createdAt: now.toISOString(),
        },
        updatedAt: now,
      },
      { merge: true },
    );

  return toMessage(messageRef.id, roomId, payload);
}

export async function toggleReaction(
  roomId: string,
  messageId: string,
  openId: string,
  emoji: string,
): Promise<ChatMessage> {
  const db = requireDb();
  await assertRoomMember(roomId, openId);

  const messageRef = db
    .collection(CHATS_COLLECTION)
    .doc(roomId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc(messageId);
  const snapshot = await messageRef.get();
  if (!snapshot.exists) throw new Error("Message not found.");
  const data = snapshot.data() ?? {};
  const reactions: Record<string, string[]> = { ...(data.reactions ?? {}) };
  const current = new Set(reactions[emoji] ?? []);
  if (current.has(openId)) current.delete(openId);
  else current.add(openId);
  if (current.size === 0) delete reactions[emoji];
  else reactions[emoji] = Array.from(current);

  await messageRef.set({ reactions }, { merge: true });
  return toMessage(messageId, roomId, { ...data, reactions });
}

/** Soft-delete: content is cleared but the bubble stays ("Message deleted"). */
export async function deleteMessage(
  roomId: string,
  messageId: string,
  openId: string,
  isAdmin: boolean,
): Promise<ChatMessage> {
  const db = requireDb();
  await assertRoomMember(roomId, openId);

  const messageRef = db
    .collection(CHATS_COLLECTION)
    .doc(roomId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc(messageId);
  const snapshot = await messageRef.get();
  if (!snapshot.exists) throw new Error("Message not found.");
  const data = snapshot.data() ?? {};
  if (data.senderId !== openId && !isAdmin)
    throw new Error("You can only delete your own messages.");

  await messageRef.set(
    {
      deleted: true,
      deletedBy: openId,
      text: null,
      mediaUrl: null,
      fileName: null,
      reactions: {},
      replyTo: null,
    },
    { merge: true },
  );
  return toMessage(messageId, roomId, {
    ...data,
    deleted: true,
    text: null,
    mediaUrl: null,
    fileName: null,
    reactions: {},
    replyTo: null,
  });
}

export async function markRoomRead(
  roomId: string,
  openId: string,
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(CHATS_COLLECTION).doc(roomId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return;
  const data = snapshot.data() ?? {};
  if (!((data.participantIds ?? []) as string[]).includes(openId)) return;
  const readAt = {
    ...((data.readAt ?? {}) as Record<string, string>),
    [openId]: new Date().toISOString(),
  };
  await ref.set({ readAt }, { merge: true });
}

/** Everyone except the caller — the address book for starting new chats. */
export async function listChatContacts(openId: string): Promise<ChatContact[]> {
  const db = requireDb();
  const snapshot = await db.collection(USERS_COLLECTION).limit(300).get();
  return snapshot.docs
    .filter((doc) => doc.id !== openId)
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name ?? ""),
        email: (data.email ?? null) as string | null,
        role: String(data.role ?? "user"),
        status: String(data.status ?? "active"),
      };
    })
    .filter((contact) => contact.name && contact.status !== "suspended")
    .map(({ id, name, email, role }) => ({ id, name, email, role }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 200);
}

// ────────────────────────── SSE plumbing ──────────────────────────

function writeEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

async function authenticate(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req as never);
    if (!user || user.status === "suspended") {
      res.status(403).json({ error: "Account suspended." });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ error: "Sign in to stream messages." });
    return null;
  }
}

type Disconnect = () => void;

function keepAlive(res: Response): Disconnect {
  const timer = setInterval(() => res.write(": ping\n\n"), 20_000);
  return () => clearInterval(timer);
}

// ────────────────────────── route wiring ──────────────────────────

const uploadsDir = path.resolve(process.cwd(), "uploads");

const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
};

const MAX_UPLOAD_CHARS = 7_000_000; // ~5MB decoded

export function registerChatRoutes(app: Express): void {
  // Serve anything dropped into ./uploads (chat attachments).
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(
    "/uploads",
    express.static(uploadsDir, { maxAge: "7d", fallthrough: true }),
  );

  // Base64 upload for images / voice notes / files. Returns a public /uploads URL.
  app.post("/api/chat/upload", async (req: Request, res: Response) => {
    const user = await authenticate(req, res);
    if (!user) return;

    const { fileName, mimeType, dataBase64 } = (req.body ?? {}) as {
      fileName?: string;
      mimeType?: string;
      dataBase64?: string;
    };
    if (!mimeType || !dataBase64) {
      res.status(400).json({ error: "Missing file payload." });
      return;
    }
    if (dataBase64.length > MAX_UPLOAD_CHARS) {
      res.status(413).json({ error: "File is too large (5MB max)." });
      return;
    }
    const cleanName = path
      .basename(String(fileName ?? "file"))
      .replace(/[^\w.\- ]+/g, "_")
      .slice(0, 120);
    const ext =
      UPLOAD_EXTENSIONS[mimeType] ??
      cleanName.split(".").pop()?.toLowerCase().slice(0, 8) ??
      "bin";
    const chatDir = path.join(uploadsDir, "chat");
    if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });

    const id = randomUUID().replace(/-/g, "").slice(0, 32);
    const target = path.join(chatDir, `${id}.${ext}`);
    try {
      fs.writeFileSync(target, Buffer.from(dataBase64, "base64"));
    } catch {
      res.status(500).json({ error: "Could not store the file." });
      return;
    }

    const url = `/uploads/chat/${id}.${ext}`;
    res.json({
      url,
      fileName: cleanName,
      size: Math.round((dataBase64.length * 3) / 4),
    });
  });

  // Room-list stream: every room the caller belongs to.
  app.get("/api/chat/streamRooms", async (req: Request, res: Response) => {
    const user = await authenticate(req, res);
    if (!user) return;

    sseHeaders(res);
    const stopKeepAlive = keepAlive(res);
    const onClose = () => {
      stopKeepAlive();
      unsubscribe();
    };
    res.on("close", onClose);

    let unsubscribe: () => void = () => undefined;
    try {
      const db = requireDb();
      const seen = new Map<string, string>();
      let first = true;
      unsubscribe = db
        .collection(CHATS_COLLECTION)
        .where("participantIds", "array-contains", user.openId)
        .orderBy("updatedAt", "desc")
        .limit(100)
        .onSnapshot(
          (snapshot) => {
            const rooms: ChatRoom[] = snapshot.docs.map((doc) =>
              toRoom(doc.id, doc.data()),
            );
            if (first) {
              first = false;
              writeEvent(res, "sync", { rooms });
              rooms.forEach((room) => seen.set(room.id, JSON.stringify(room)));
              return;
            }
            rooms.forEach((room) => {
              const serialized = JSON.stringify(room);
              if (seen.get(room.id) !== serialized) {
                seen.set(room.id, serialized);
                writeEvent(res, "room", room);
              }
            });
            for (const id of Array.from(seen.keys())) {
              if (!snapshot.docs.some((doc) => doc.id === id)) {
                seen.delete(id);
                writeEvent(res, "removed", { roomId: id });
              }
            }
          },
          () => undefined,
        );
    } catch {
      writeEvent(res, "error", {
        message: "Chat stream unavailable — Firestore is offline.",
      });
      stopKeepAlive();
    }
  });

  // Message stream for one room: initial sync, then per-message deltas.
  app.get("/api/chat/streamMessages", async (req: Request, res: Response) => {
    const user = await authenticate(req, res);
    if (!user) return;

    const roomId = String(req.query.roomId ?? "");
    if (!roomId) {
      res.status(400).json({ error: "roomId is required." });
      return;
    }
    try {
      await assertRoomMember(roomId, user.openId);
    } catch {
      res
        .status(403)
        .json({ error: "You are not a member of this conversation." });
      return;
    }

    sseHeaders(res);
    const stopKeepAlive = keepAlive(res);
    let unsubscribe: () => void = () => undefined;
    res.on("close", () => {
      stopKeepAlive();
      unsubscribe();
    });

    try {
      const db = requireDb();
      const seen = new Map<string, string>();
      let first = true;
      unsubscribe = db
        .collection(CHATS_COLLECTION)
        .doc(roomId)
        .collection(MESSAGES_SUBCOLLECTION)
        .orderBy("createdAt", "asc")
        .limit(STREAM_MESSAGE_LIMIT)
        .onSnapshot(
          (snapshot) => {
            const messages = snapshot.docs.map((doc) =>
              toMessage(doc.id, roomId, doc.data()),
            );
            if (first) {
              first = false;
              writeEvent(res, "sync", { roomId, messages });
              messages.forEach((message) =>
                seen.set(message.id, JSON.stringify(message)),
              );
              return;
            }
            messages.forEach((message) => {
              const serialized = JSON.stringify(message);
              if (seen.get(message.id) !== serialized) {
                seen.set(message.id, serialized);
                writeEvent(res, "message", message);
              }
            });
            for (const id of Array.from(seen.keys())) {
              if (!snapshot.docs.some((doc) => doc.id === id)) {
                seen.delete(id);
                writeEvent(res, "removed", { messageId: id });
              }
            }
          },
          () => undefined,
        );
    } catch {
      writeEvent(res, "error", {
        message: "Message stream unavailable — Firestore is offline.",
      });
      stopKeepAlive();
    }
  });
}
