// Real-time internal messaging. Rooms are Firestore docs under `chats` with a
// `messages` subcollection; the server streams changes over Server-Sent Events
// (GET /api/chat/stream*) and all writes go through tRPC mutations. Pure module
// so the client and server can both import it.

export const CHAT_MESSAGE_TYPES = ["text", "image", "voice", "file"] as const;
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export type ChatReaction = Record<string, string[]>;

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: ChatMessageType;
  /** Plain text for "text" messages; a caption for media. Null when empty. */
  text: string | null;
  /** Serve URL for image / voice / file messages. */
  mediaUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  /** Voice-message length in seconds. */
  voiceDuration: number | null;
  replyTo: {
    id: string;
    senderName: string;
    text: string | null;
    type: ChatMessageType;
  } | null;
  reactions: ChatReaction;
  deleted: boolean;
  deletedBy: string | null;
  createdAt: string;
};

export type ChatRoomParticipant = {
  openId: string;
  name: string;
};

export type ChatRoom = {
  id: string;
  participants: ChatRoomParticipant[];
  lastMessage: {
    text: string;
    senderName: string;
    type: ChatMessageType;
    createdAt: string;
  } | null;
  /** openId -> ISO timestamp of when that participant last read the room. */
  readAt: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

/** A contact the signed-in user can start a chat with. */
export type ChatContact = {
  id: string;
  name: string;
  email: string | null;
  role: string;
};

/** Payload for sending a message from the client. */
export type CreateChatMessageInput = {
  type: ChatMessageType;
  text?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  voiceDuration?: number | null;
  replyTo?: ChatMessage["replyTo"];
};