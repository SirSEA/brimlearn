import { Crown, Loader2, PhoneOff, VideoOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { jitsiRoomName } from "@shared/session";

type JitsiApi = {
  new (domain: string, options: Record<string, unknown>): unknown;
};

type LiveRoomSession = {
  id: string;
  title: string;
  subject?: string | null;
  hostName?: string | null;
};

type LiveRoomProps = {
  session: LiveRoomSession;
  displayName: string;
  isHost?: boolean;
  onLeave: () => void;
};

let externalApiPromise: Promise<JitsiApi> | null = null;

function loadJitsiExternalApi(): Promise<JitsiApi> {
  if (externalApiPromise) return externalApiPromise;
  externalApiPromise = new Promise((resolve, reject) => {
    const global = window as typeof window & { JitsiMeetExternalAPI?: JitsiApi };
    const existing = document.getElementById("jitsi-external-api") as HTMLScriptElement | null;
    if (global.JitsiMeetExternalAPI) {
      resolve(global.JitsiMeetExternalAPI);
      return;
    }
    const script = existing ?? document.createElement("script");
    script.id = "jitsi-external-api";
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      if (global.JitsiMeetExternalAPI) resolve(global.JitsiMeetExternalAPI);
      else reject(new Error("Jitsi failed to initialise."));
    };
    script.onerror = () => {
      externalApiPromise = null;
      reject(new Error("Could not load the live classroom (Jitsi)."));
    };
    if (!existing) document.head.appendChild(script);
  });
  return externalApiPromise;
}

/**
 * Full-screen embedded live classroom. Uses the Jitsi Meet iframe API on the
 * public meet.jit.si service — no provider accounts needed. The first person
 * to join a room becomes the moderator (host) automatically; the teacher opens
 * it from the class calendar, students from the Classroom tab.
 *
 * Jitsi brings the in-built controls for mic/camera, text chat, raise-hand and
 * participant list, so this component only wraps it with in-app chrome.
 */
export function LiveRoom({ session, displayName, isHost, onLeave }: LiveRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setFailed(false);

    loadJitsiExternalApi()
      .then((API) => {
        if (disposed || !containerRef.current) return;
        const instance = new API("meet.jit.si", {
          roomName: jitsiRoomName(session.id),
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          lang: "en",
          userInfo: {
            displayName: displayName.trim() || (isHost ? "Teacher" : "Learner"),
          },
          configOverwrite: {
            startWithAudioMuted: !isHost,
            startWithVideoMuted: !isHost,
            prejoinConfig: { enabled: false },
            enableWelcomePage: false,
            liveStreamingEnabled: false,
            recordingEnabled: false,
            disableBeforeUnloadHandler: true,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            DEFAULT_BACKGROUND: "#0f2b22",
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        }) as unknown as {
          on: (event: string, handler: () => void) => void;
          dispose: () => void;
        };
        apiRef.current = instance;
        instance.on("videoConferenceJoined", () => {
          if (!disposed) setReady(true);
        });
        instance.on("readyToClose", () => onLeaveRef.current());
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose();
      } catch {
        // The iframe may already be gone.
      }
      apiRef.current = null;
    };
  }, [session.id, displayName, isHost, attempt]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0e2b22]/70 p-3 sm:p-6" onClick={onLeave}>
      <div
        className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[#0f2b22] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff4d4d] px-2.5 py-1 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{session.title}</div>
            <div className="truncate text-[11px] text-[#c4ded0]">
              {session.subject ? `${session.subject} · ` : ""}
              {isHost ? "You're the host — start teaching when ready." : session.hostName ? `Hosted by ${session.hostName}` : "Waiting for the teacher to start"}
            </div>
          </div>
          {isHost && (
            <span className="hidden items-center gap-1.5 rounded-full bg-[#d8f36a] px-3 py-1.5 text-[10px] font-bold text-[#173c2e] sm:flex">
              <Crown size={12} /> Host
            </span>
          )}
          <button onClick={onLeave} className="flex items-center gap-2 rounded-full bg-[#d9533f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#c1402e]">
            <PhoneOff size={14} /> Leave class
          </button>
        </div>

        <div className="relative flex-1 bg-black">
          <div ref={containerRef} className={ready ? "h-full w-full" : "h-full w-full opacity-0"} />

          {failed ? (
            <div className="absolute inset-0 grid place-items-center bg-[#0f2b22] p-6">
              <div className="max-w-md text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-[#c4ded0]"><VideoOff size={24} /></div>
                <h3 className="mt-4 text-lg font-semibold text-white">The live classroom couldn't load.</h3>
                <p className="mt-2 text-sm leading-6 text-[#c4ded0]">Check your internet connection and retry. The room link also works in a separate tab if your network blocks embeds.</p>
                <button onClick={() => { setFailed(false); setReady(false); setAttempt((value) => value + 1); }} className="mt-5 rounded-full bg-[#d8f36a] px-5 py-2.5 text-xs font-semibold text-[#173c2e] hover:bg-[#e4fb8b]">
                  Retry connecting
                </button>
              </div>
            </div>
          ) : (
            !ready && (
              <div className="absolute inset-0 grid place-items-center bg-[#0f2b22] p-6">
                <div className="text-center">
                  <Loader2 size={28} className="mx-auto animate-spin text-[#d8f36a]" />
                  <h3 className="mt-4 text-lg font-semibold text-white">Connecting you to the classroom…</h3>
                  <p className="mt-2 text-sm text-[#c4ded0]">
                    {isHost ? "You joined first — the room is open for learners." : "Allow camera and mic access when the browser asks."}
                  </p>
                </div>
              </div>
            )
          )}

          {ready && (
            <button
              onClick={onLeave}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Leave the live class"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}