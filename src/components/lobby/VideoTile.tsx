"use client";

import { useEffect, useRef } from "react";
import type { ICameraVideoTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";

type Props = {
  label: string;
  track: ICameraVideoTrack | IRemoteVideoTrack | null;
};

export function VideoTile({ label, track }: Props) {
  const videoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoRef.current || !track) return;

    track.play(videoRef.current);
    return () => {
      track.stop();
    };
  }, [track]);

  return (
    <div className="relative rounded-xl border border-slate-300 bg-slate-900 overflow-hidden aspect-video">
      <div ref={videoRef} className="h-full w-full" />
      <div className="absolute left-2 bottom-2 text-xs text-white bg-black/50 px-2 py-1 rounded-md">
        {label}
      </div>
    </div>
  );
}
