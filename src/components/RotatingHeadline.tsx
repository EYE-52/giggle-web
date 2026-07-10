"use client";

import { useState, useEffect } from "react";

const headlines = [
  { main: "Squad up.", sub: "Meet anyone." },
  { main: "Bring your crew.", sub: "Find new friends." },
  { main: "Never alone.", sub: "Always together." },
  { main: "Group vibes.", sub: "Real connections." },
  { main: "Your squad.", sub: "Their squad." },
  { main: "Connect with", sub: "Your people." },
];

export default function RotatingHeadline() {
  const [current, setCurrent] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % headlines.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="overflow-hidden" aria-live="polite" aria-label={`${headlines[current].main} ${headlines[current].sub}`}>
      <span
        className={`block text-4xl sm:text-6xl md:text-[72px] font-black text-[#1b1c1a] dark:text-white leading-tight md:leading-[72px] transition-all duration-500 italic ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {headlines[current].main}
      </span>
      <span
        className={`block text-4xl sm:text-6xl md:text-[72px] font-black text-[#516051] dark:text-[#7f9b8f] leading-tight md:leading-[72px] transition-all duration-500 italic ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {headlines[current].sub}
      </span>
    </h1>
  );
}
