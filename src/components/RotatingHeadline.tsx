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
    <div className="overflow-hidden">
      <h2
        className={`text-[72px] font-extrabold text-[#1b1c1a] leading-[72px] transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {headlines[current].main}
      </h2>
      <p
        className={`text-[72px] font-extrabold text-[#697969] leading-[72px] transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {headlines[current].sub}
      </p>
    </div>
  );
}
