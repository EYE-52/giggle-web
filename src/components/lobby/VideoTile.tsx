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
  isBlurred?: boolean;
  isSpeaking?: boolean;
  networkQuality?: number;
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

export function VideoTile({ label, track, role, ready, presence, micOn, showVideo = true, isBlurred = false, isSpeaking = false, networkQuality = 0 }: Props) {
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
    <div className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden aspect-video group ${
      isSpeaking ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-[1.02]" : "border-transparent bg-[#1a2119]"
    }`}>
      <div 
        ref={videoRef} 
        className={`h-full w-full transition-all duration-1000 ${isBlurred ? "blur-2xl scale-110 grayscale" : "blur-0 scale-100 grayscale-0"}`} 
      />
      <div className="absolute right-2 top-2 flex gap-1 z-10">
        {networkQuality > 0 && (
          <span 
            className={`inline-flex items-center justify-center rounded-full p-1.5 bg-black/40 text-white backdrop-blur-md`}
            title={`Network quality: ${networkQuality}`}
          >
            <div className="flex gap-0.5 items-end h-3 w-3">
               <div className={`w-0.5 rounded-full ${networkQuality <= 4 ? 'bg-emerald-400 h-full' : 'bg-rose-400 h-1/3'}`} />
               <div className={`w-0.5 rounded-full ${networkQuality <= 3 ? 'bg-emerald-400 h-full' : 'bg-gray-400 h-1/2'}`} />
               <div className={`w-0.5 rounded-full ${networkQuality <= 2 ? 'bg-emerald-400 h-full' : 'bg-gray-400 h-3/4'}`} />
            </div>
          </span>
        )}
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
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#d9e2d1] bg-[#1a2119]/90 z-20">
          Camera off
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 md:p-3 text-white z-10">
        <div className="font-bold text-shadow-sm text-xs md:text-sm truncate">{label}</div>
        <div className="mt-1 flex flex-wrap gap-1 md:gap-2 text-[8px] md:text-[10px] uppercase tracking-wider font-semibold">
          {role ? <span className="rounded-md bg-white/20 px-1.5 md:px-2 py-0.5 backdrop-blur-md">{role}</span> : null}
          {typeof ready === "boolean" ? (
            <span className={`rounded-md px-1.5 md:px-2 py-0.5 backdrop-blur-md ${ready ? "bg-emerald-500/40 text-emerald-50" : "bg-amber-500/40 text-amber-50"}`}>
              {ready ? "Ready" : "Wait"}
            </span>
          ) : null}
          {presence ? <span className="hidden sm:inline-block rounded-md bg-white/20 px-1.5 md:px-2 py-0.5 backdrop-blur-md">{presence}</span> : null}
        </div>
      </div>
    </div>
  );
}
