'use client';

import { signIn } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation() {
  return (
    <nav className="flex items-center justify-between max-w-[1280px] mx-auto px-[32px] py-[24px] animate-fade-in">
      <h1 className="text-[24px] font-extrabold text-[#1b1c1a] dark:text-white">Giggle</h1>
      <div className="flex items-center gap-[32px]">
        <a
          href="#about"
          className="text-[#434842] dark:text-gray-300 font-medium hover:text-[#1b1c1a] dark:hover:text-white transition-colors"
        >
          About
        </a>
        <ThemeToggle />
        <button
          onClick={() => signIn("google")}
          className="px-[32px] py-[12px] bg-[#516051] dark:bg-[#697969] text-white rounded-[8px] font-semibold hover:bg-opacity-90 dark:hover:bg-opacity-80 transition-all shadow-sm hover:shadow-md"
        >
          Sign in
        </button>
      </div>
    </nav>
  );
}