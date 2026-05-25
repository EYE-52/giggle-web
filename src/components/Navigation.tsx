'use client';

import { signIn } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation() {
  return (
    <nav className="flex items-center justify-between max-w-[1280px] mx-auto px-6 md:px-[32px] py-4 md:py-[24px] animate-fade-in relative z-50">
      <div className="text-[#516051] dark:text-white font-black text-xl md:text-2xl tracking-tighter">giggle.</div>
      <div className="flex items-center gap-4 md:gap-[32px]">
        <a
          href="#about"
          className="hidden md:block text-[#434842] dark:text-gray-300 font-medium hover:text-[#1b1c1a] dark:hover:text-white transition-colors"
        >
          About
        </a>
        <ThemeToggle />
        <button
          onClick={() => signIn("google")}
          className="px-4 md:px-[32px] py-2 md:py-[12px] bg-[#516051] dark:bg-[#697969] text-white rounded-[8px] font-semibold hover:bg-opacity-90 dark:hover:bg-opacity-80 transition-all shadow-sm hover:shadow-md text-sm md:text-base"
        >
          Sign in
        </button>
      </div>
    </nav>
  );
}