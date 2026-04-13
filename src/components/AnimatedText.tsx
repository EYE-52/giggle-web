"use client";

import { useState, useEffect } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  repeatDelayMs?: number;
}

export default function AnimatedText({
  text,
  className = "",
  delay = 0,
  repeatDelayMs = 7000,
}: AnimatedTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setDisplayText("");
    setIsTyping(true);

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let repeatTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      let currentIndex = 0;
      intervalId = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.substring(0, currentIndex));
          setIsTyping(true);
          currentIndex++;
        } else {
          if (intervalId) {
            clearInterval(intervalId);
          }
          setIsTyping(false);
          repeatTimer = setTimeout(() => {
            setCycle((prev) => prev + 1);
          }, repeatDelayMs);
        }
      }, 30);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (repeatTimer) {
        clearTimeout(repeatTimer);
      }
    };
  }, [text, delay, repeatDelayMs, cycle]);

  return (
    <span className={className}>
      {displayText}
      {isTyping && <span className="animate-pulse">|</span>}
    </span>
  );
}
