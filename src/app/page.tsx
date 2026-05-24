"use client";

import { signIn, useSession } from "next-auth/react";
import { LobbyClient } from "@/components/lobby/LobbyClient";
import RotatingHeadline from "@/components/RotatingHeadline";
import { Navigation } from "@/components/Navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
  Users, 
  Target, 
  ShieldCheck, 
  Zap, 
  Lock,
  Crown,
  History,
  Video
} from "lucide-react";

function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div ref={containerRef} className="bg-[#f7faf6] dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-[#516051] selection:text-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-20">
        <motion.div 
          style={{ y: backgroundY }}
          className="absolute inset-0 z-0 opacity-20 dark:opacity-10 pointer-events-none"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#516051] rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#697969] rounded-full blur-[128px]" />
        </motion.div>

        <div className="max-w-5xl mx-auto z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#516051]/10 border border-[#516051]/20 text-[#516051] dark:text-gray-300 text-xs font-bold uppercase tracking-widest mb-8">
              <Zap size={14} className="fill-current" />
              <span>The Squad Discovery Platform</span>
            </div>

            <div className="mb-8">
              <RotatingHeadline />
            </div>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto mb-12">
              Bring your friends into a private shared lobby and "collide" with another squad in real-time synchronized video encounters. 
              <span className="block mt-4 font-semibold text-gray-900 dark:text-white italic">Groups discovery, reimagined.</span>
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => signIn("google")}
              className="px-10 py-5 bg-[#516051] dark:bg-[#697969] text-white rounded-2xl font-black text-lg shadow-2xl shadow-[#516051]/30 hover:bg-[#405040] transition-all flex items-center gap-3 mx-auto"
            >
              Start a Squad Lobby
              <Users size={20} />
            </motion.button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50"
        >
          <div className="w-6 h-10 border-2 border-[#516051] rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-[#516051] rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* The Concept: Squad to Squad */}
      <section className="py-32 px-6 border-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h3 className="text-4xl md:text-5xl font-black leading-tight">
                Traditional video chat is lonely. <br />
                <span className="text-[#516051] dark:text-[#7f9b8f]">Discovery is better with friends.</span>
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Solo chatting with strangers can be awkward and unsafe. Giggle changes the dynamic by pairing entire **Squads**. Whether you're a duo or a group of four, we match you with a group of similar size for an authentic social experience.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: ShieldCheck, title: "Built-in Safety", desc: "Group dynamics naturally deter toxic behavior." },
                  { icon: Target, title: "Vibe Matching", desc: "Use Vibe Tags to find squads with similar interests." },
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-[#f7faf6] dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <item.icon className="text-[#516051] mb-4" size={28} />
                    <h4 className="font-bold mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-[#516051]/20 border-8 border-white dark:border-gray-800"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#516051]/20 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=800&fit=crop" 
                alt="Friends having fun" 
                className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg z-20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-bold uppercase tracking-widest text-[#516051] dark:text-gray-300">Live Collision</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">2 Squads | 8 Participants | #Gaming #College</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Journey: How it works */}
      <section className="py-32 px-6 bg-[#f7faf6] dark:bg-gray-950">
        <div className="max-w-5xl mx-auto text-center mb-20">
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-6"
          >
            How Your Squad Meets
          </motion.h3>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Three steps from lobby to collision.</p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            { 
              step: "01", 
              title: "Lobby Up", 
              desc: "Create a private lobby. Invite your friends via a 6-digit code. Hang out and prep your squad's vibe.",
              icon: Users
            },
            { 
              step: "02", 
              title: "Set Your Vibe", 
              desc: "Select Vibe Tags to tell the algorithm what you're interested in. Our engine shards global traffic for low latency.",
              icon: Target
            },
            { 
              step: "03", 
              title: "Collision", 
              desc: "Hit 'Find Match' to initiate a collision. A 3-second cinematic countdown leads to a synchronized reveal.",
              icon: Zap
            }
          ].map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              key={idx}
              className="relative p-10 rounded-[32px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl shadow-[#516051]/5 hover:shadow-[#516051]/10 transition-all group"
            >
              <div className="absolute -top-6 left-10 text-6xl font-black text-[#516051]/10 dark:text-gray-800 group-hover:text-[#516051]/20 transition-colors">
                {item.step}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#516051] text-white flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform">
                <item.icon size={28} />
              </div>
              <h4 className="text-2xl font-black mb-4">{item.title}</h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Giggle Premium: Monetization Section */}
      <section className="py-32 px-6 bg-white dark:bg-gray-900/30 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-6"
            >
              <Crown size={14} className="fill-current" />
              <span>Giggle Premium</span>
            </motion.div>
            <h3 className="text-4xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white">Elevate Your Squad</h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Unlock the full potential of social discovery. Designed for power squads who want better connections, faster.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {[
              {
                title: "Fast Pass",
                desc: "Jump to the front of the matchmaking queue. Our algorithm prioritizes your squad instantly.",
                icon: Zap
              },
              {
                title: "Encounter History",
                desc: "Never lose a great connection. Browse squads you've met and send 'Vibe Checks' to reconnect.",
                icon: History
              },
              {
                title: "VIP Vibe Tags",
                desc: "Access exclusive tags like #Dating, #Local, and #VIP to find highly curated squads.",
                icon: Target
              },
              {
                title: "Crystal Clear HD",
                desc: "Unlock 1080p high-bitrate video for the most immersive squad encounters possible.",
                icon: Video
              }
            ].map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                key={idx}
                className="group relative p-8 rounded-[32px] bg-[#fcfdfa] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/5"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon size={24} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{item.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
                <div className="absolute top-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Crown size={16} className="text-amber-500/30" />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 p-8 rounded-[40px] bg-amber-500/5 border border-amber-500/10 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Crown size={32} />
              </div>
              <div className="text-left">
                <h4 className="text-2xl font-black italic text-gray-900 dark:text-white">The Leader Advantage</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">One Premium member makes the entire squad Premium for the session.</p>
              </div>
            </div>
            <button 
              onClick={() => signIn("google")}
              className="whitespace-nowrap px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95"
            >
              Unlock Premium
            </button>
          </motion.div>
        </div>
      </section>

      {/* Tech Promise: Scaling Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto rounded-[48px] bg-gradient-to-br from-[#516051] to-[#1a2119] p-12 md:p-24 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-[160px]" />
          </div>

          <div className="max-w-3xl relative z-10">
            <h3 className="text-4xl md:text-6xl font-black mb-8 leading-tight italic">
              Premium Discovery. <br />
              No Junk. No Bots.
            </h3>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed mb-12">
              Giggle is built on high-scale, Redis-backed infrastructure. We utilize geo-sharded matchmaking and Redlock atomic pairing to ensure you connect with real squads, instantly, anywhere in the world.
            </p>

            <div className="flex flex-wrap gap-10">
              <div className="flex items-center gap-3">
                <Zap size={24} className="text-[#7f9b8f]" />
                <span className="font-bold uppercase tracking-widest text-sm">Real-time Signaling</span>
              </div>
              <div className="flex items-center gap-3">
                <Lock size={24} className="text-[#7f9b8f]" />
                <span className="font-bold uppercase tracking-widest text-sm">Atomic Handshakes</span>
              </div>
              <div className="flex items-center gap-3">
                <Target size={24} className="text-[#7f9b8f]" />
                <span className="font-bold uppercase tracking-widest text-sm">Region Aware</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <section className="py-32 px-6 text-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h3 className="text-5xl font-black mb-6">Ready to Squad Up?</h3>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-12 leading-relaxed">
            Create your lobby, invite your best friends, and find your twin squad across the globe.
          </p>
          <button
            onClick={() => signIn("google")}
            className="px-12 py-5 bg-[#516051] text-white rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#516051]/20"
          >
            Sign in with Google
          </button>

          <div className="mt-20 flex flex-col items-center gap-4 border-t border-gray-100 dark:border-gray-900 pt-10">
            <div className="text-[#516051] dark:text-white font-black text-2xl tracking-tighter">giggle.</div>
            <p className="text-gray-400 text-xs tracking-[0.2em] uppercase font-bold">© 2026 Giggle Tech • All rights reserved</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f7faf6] dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-[#516051] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return (
      <LobbyClient
        backendToken={session.backendToken || ""}
        userName={session.user?.name || "User"}
        userImage={session.user?.image}
        isPremium={session.user?.isPremium || false}
      />
    );
  }

  return <LandingPage />;
}
