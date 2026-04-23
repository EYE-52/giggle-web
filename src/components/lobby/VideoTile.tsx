"use client";

import { useEffect, useRef } from "react";
import type { ICameraVideoTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";

type Props = {
  label: string;
  track: ICameraVideoTrack | IRemoteVideoTrack | null;
  role?: string;
  ready?: boolean;
  presence?: string;
  micOn?: boolean;
  showVideo?: boolean;
};

export function MicStateIcon({ enabled, className = "h-3.5 w-3.5" }: { enabled: boolean; className?: string }) {
  if (enabled) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function CameraStateIcon({ enabled, className = "h-3.5 w-3.5" }: { enabled: boolean; className?: string }) {
  if (enabled) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function VideoTile({ label, track, role, ready, presence, micOn, showVideo = true }: Props) {
  const videoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = videoRef.current;
    if (!container) return;

    container.innerHTML = "";
    if (!track || !showVideo) return;

    track.play(container);
    return () => {
      track.stop();
      container.innerHTML = "";
    };
  }, [showVideo, track]);

  return (
    <div className="relative rounded-xl border border-[#c5c9c1] bg-[#1a2119] overflow-hidden aspect-video">
      <div ref={videoRef} className="h-full w-full" />
      <div className="absolute right-2 top-2 flex gap-1">
        <span
          className={`inline-flex items-center justify-center rounded-full p-1.5 ${
            micOn ? "bg-sky-500/70 text-white" : "bg-rose-500/70 text-white"
          }`}
          title={micOn ? "Mic on" : "Mic muted"}
        >
          <MicStateIcon enabled={Boolean(micOn)} />
        </span>
        <span
          className={`inline-flex items-center justify-center rounded-full p-1.5 ${
            showVideo ? "bg-sky-500/70 text-white" : "bg-rose-500/70 text-white"
          }`}
          title={showVideo ? "Camera on" : "Camera off"}
        >
          <CameraStateIcon enabled={showVideo} />
        </span>
      </div>
      {!showVideo ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#d9e2d1] bg-[#1a2119]/90">
          Camera off
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[#f8fbf6]">
        <div className="font-medium">{label}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#d9e2d1]">
          {role ? <span className="rounded-full bg-white/10 px-2 py-1">{role}</span> : null}
          {typeof ready === "boolean" ? (
            <span className={`rounded-full px-2 py-1 ${ready ? "bg-emerald-500/30 text-emerald-100" : "bg-amber-500/30 text-amber-100"}`}>
              {ready ? "Ready" : "Not ready"}
            </span>
          ) : null}
          {presence ? <span className="rounded-full bg-white/10 px-2 py-1">{presence}</span> : null}
        </div>
      </div>
    </div>
  );
}
