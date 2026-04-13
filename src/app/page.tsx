import { auth, signIn } from "@/auth";
import { LobbyClient } from "@/components/lobby/LobbyClient";
import RotatingHeadline from "@/components/RotatingHeadline";
import AnimatedText from "@/components/AnimatedText";

export default async function Home() {
  const session = await auth();

  return (
    <>
      {!session ? (
        <main className="min-h-screen bg-white overflow-hidden">
          {/* Navigation */}
          <nav className="flex items-center justify-between max-w-[1280px] mx-auto px-[32px] py-[24px] animate-fade-in">
            <h1 className="text-[24px] font-extrabold text-[#1b1c1a]">Giggle</h1>
            <div className="flex items-center gap-[32px]">
              <a
                href="#about"
                className="text-[#434842] font-medium hover:text-[#1b1c1a] transition-colors"
              >
                About
              </a>
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
              >
                <button className="px-[32px] py-[12px] bg-[#516051] text-white rounded-[8px] font-semibold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md">
                  Sign in
                </button>
              </form>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="max-w-[1280px] mx-auto px-[32px] py-[96px] relative">
            <div className="grid grid-cols-2 gap-[64px] items-center">
              {/* Left Column */}
              <div className="flex flex-col gap-[32px]">
                <div className="animate-fade-in-up-loop" style={{ animationDelay: "0.1s" }}>
                  <RotatingHeadline />
                </div>
                <p
                  className="text-[20px] text-[#434842] leading-[32px] max-w-[576px] animate-fade-in-up-loop"
                  style={{ animationDelay: "0.2s" }}
                >
                  Bring your friends into a shared video space and get matched with another squad in real-time. Experience meaningful connections with groups, not strangers alone. A premium, moderated way to discover new friends together.
                </p>
                <div
                  className="flex gap-[16px] pt-[8px] animate-fade-in-up-loop"
                  style={{ animationDelay: "0.3s" }}
                >
                  <form
                    action={async () => {
                      "use server";
                      await signIn("google");
                    }}
                  >
                    <button className="px-[32px] py-[16px] bg-gradient-to-br from-[#516051] to-[#697969] text-white rounded-[8px] font-semibold hover:shadow-lg transition-all shadow-md hover:scale-105 active:scale-95">
                      Create Your Squad
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column - Featured Card with Testimonial */}
              <div className="flex flex-col justify-center relative">
                {/* Main Card */}
                <div
                  className="transform rotate-1 shadow-lg rounded-[12px] overflow-hidden bg-white border border-[rgba(0,0,0,0.08)] animate-fade-in-up-loop"
                  style={{ animationDelay: "0.4s" }}
                >
                  {/* Browser Header */}
                  <div className="bg-[#f1f1f1] flex gap-[6px] items-center px-[16px] py-[10px]">
                    <div className="w-[8px] h-[8px] rounded bg-[#ff5f56] animate-bounce-in-loop" style={{ animationDelay: "0.5s" }} />
                    <div className="w-[8px] h-[8px] rounded bg-[#ffbd2e] animate-bounce-in-loop" style={{ animationDelay: "0.6s" }} />
                    <div className="w-[8px] h-[8px] rounded bg-[#27c93f] animate-bounce-in-loop" style={{ animationDelay: "0.7s" }} />
                    <div className="flex-1 ml-[12px] bg-white rounded border border-[rgba(0,0,0,0.05)] h-[18px]" />
                  </div>
                  {/* Content */}
                  <div className="bg-[#efeeeb] aspect-video flex items-center justify-center overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop"
                      alt="Squad meeting"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Testimonial Card - Right Side */}
                <div
                  className="absolute -right-12 bottom-2 transform -rotate-2 bg-white rounded-[12px] p-[25px] border border-[rgba(196,200,192,0.2)] shadow-lg max-w-[320px] animate-fade-in-up-loop"
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#516051] animate-pulse" />
                    <span className="text-[12px] font-semibold text-[#516051] uppercase tracking-[1.2px]">
                      LIVE NOW
                    </span>
                  </div>
                  <p className="text-[14px] text-[#1b1c1a] font-medium leading-[20px]">
                    "Found our twin squad in Tokyo. We've been talking for 3 hours."
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Value Proposition Section */}
          <section className="bg-[#f5f3f0] py-[96px]">
            <div className="max-w-[1280px] mx-auto px-[32px]">
              <div className="mb-[64px] animate-fade-in-up-loop">
                <h3 className="text-[48px] font-extrabold text-[#1b1c1a] leading-[56px] mb-[16px]">
                  <AnimatedText text="Why Squad Discovery?" className="text-[48px] font-extrabold text-[#1b1c1a] leading-[56px]" delay={0} />
                </h3>
                <p className="text-[18px] text-[#697969]">
                  Traditional video chat platforms pair individual strangers. Giggle reimagines social discovery by bringing groups together for genuinely meaningful interactions.
                </p>
              </div>

              {/* Value Cards */}
              <div className="grid grid-cols-3 gap-[32px]">
                <div
                  className="bg-white rounded-[12px] p-[32px] animate-fade-in-up-loop hover:shadow-lg transition-all duration-300 hover:translate-y-[-8px]"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="text-[48px] mb-[16px] animate-bounce-in-loop" style={{ animationDelay: "0.3s" }}>👥</div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Never Meet Alone
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    Bring your friends. The group dynamic creates safer, more natural conversations than one-on-one interactions.
                  </p>
                </div>

                <div
                  className="bg-white rounded-[12px] p-[32px] animate-fade-in-up-loop hover:shadow-lg transition-all duration-300 hover:translate-y-[-8px]"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="text-[48px] mb-[16px] animate-bounce-in-loop" style={{ animationDelay: "0.4s" }}>🎯</div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Squad Matching
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    Get paired with squads of similar size. Our algorithm ensures you meet groups that match your vibe.
                  </p>
                </div>

                <div
                  className="bg-white rounded-[12px] p-[32px] animate-fade-in-up-loop hover:shadow-lg transition-all duration-300 hover:translate-y-[-8px]"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="text-[48px] mb-[16px] animate-bounce-in-loop" style={{ animationDelay: "0.5s" }}>🛡️</div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Moderated & Safe
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    Real-time content detection and community standards ensure your squad has a respectful, premium experience.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Details Section */}
          <section className="py-[96px]">
            <div className="max-w-[1280px] mx-auto px-[32px]">
              <div className="mb-[64px] animate-fade-in-up-loop">
                <h3 className="text-[56px] font-extrabold text-[#1b1c1a] leading-[64px] mb-[16px]">
                  How Giggle Works
                </h3>
                <p className="text-[18px] text-[#697969]">
                  Three simple steps to connect your squad with others.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-[48px]">
                <div className="bg-white rounded-[12px] p-[32px] border border-[rgba(0,0,0,0.05)] animate-fade-in-up-loop hover:shadow-lg transition-all duration-300 hover:translate-y-[-8px]" style={{ animationDelay: "0.1s" }}>
                  <div className="overflow-hidden rounded-[8px] mb-[24px] h-[200px]">
                    <img
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop"
                      alt="Squad Lobby"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h4 className="text-[24px] font-extrabold text-[#1b1c1a] mb-[8px]">
                    The Squad Lobby
                  </h4>
                  <p className="text-[16px] text-[#697969] mb-[16px]">
                    Create a unique Squad code and invite your friends. See their cameras in real-time before you start searching for a match.
                  </p>
                  <ul className="text-[14px] text-[#697969] space-y-[8px]">
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.4s" }}>✓ 6-digit Squad Code</li>
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.5s" }}>✓ Real-time member sync</li>
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.6s" }}>✓ Camera/mic permissions check</li>
                  </ul>
                </div>

                <div className="bg-white rounded-[12px] p-[32px] border border-[rgba(0,0,0,0.05)] animate-fade-in-up-loop hover:shadow-lg transition-all duration-300 hover:translate-y-[-8px]" style={{ animationDelay: "0.2s" }}>
                  <div className="overflow-hidden rounded-[8px] mb-[24px] h-[200px]">
                    <img
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop"
                      alt="Video Encounter"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h4 className="text-[24px] font-extrabold text-[#1b1c1a] mb-[8px]">
                    The Video Encounter
                  </h4>
                  <p className="text-[16px] text-[#697969] mb-[16px]">
                    Hit "Find a Match" and get paired instantly with another squad. Your squad appears on the left, theirs on the right—high-fidelity video, zero chaos.
                  </p>
                  <ul className="text-[14px] text-[#697969] space-y-[8px]">
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.5s" }}>✓ Instant matchmaking</li>
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.6s" }}>✓ Synchronized transition</li>
                    <li className="animate-fade-in-up-loop" style={{ animationDelay: "0.7s" }}>✓ Smart video grid layout</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Process Steps Section */}
          <section className="bg-[#f5f3f0] py-[96px]">
            <div className="max-w-[1280px] mx-auto px-[32px]">
              <h3 className="text-[48px] font-extrabold text-[#1b1c1a] text-center mb-[64px] animate-fade-in-up-loop">
                <AnimatedText text="Your Squad's Journey in Three Steps" className="text-[48px] font-extrabold text-[#1b1c1a]" delay={100} />
              </h3>

              <div className="grid grid-cols-3 gap-[48px]">
                <div className="flex flex-col items-center text-center animate-fade-in-up-loop hover:transform hover:scale-105 transition-transform duration-300" style={{ animationDelay: "0.1s" }}>
                  <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#516051] to-[#697969] flex items-center justify-center mb-[24px] border-4 border-white shadow-lg animate-bounce-in-loop" style={{ animationDelay: "0.3s" }}>
                    <span className="text-[36px] font-bold text-white">1</span>
                  </div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Create & Invite
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    Generate a Squad code and share it with your friends. They join instantly—no separate login needed.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center animate-fade-in-up-loop hover:transform hover:scale-105 transition-transform duration-300" style={{ animationDelay: "0.2s" }}>
                  <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#516051] to-[#697969] flex items-center justify-center mb-[24px] border-4 border-white shadow-lg animate-bounce-in-loop" style={{ animationDelay: "0.4s" }}>
                    <span className="text-[36px] font-bold text-white">2</span>
                  </div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Prepare Together
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    See your friends' cameras, chat, and prep your introduction. When everyone's ready, hit "Find a Match."
                  </p>
                </div>

                <div className="flex flex-col items-center text-center animate-fade-in-up-loop hover:transform hover:scale-105 transition-transform duration-300" style={{ animationDelay: "0.3s" }}>
                  <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#516051] to-[#697969] flex items-center justify-center mb-[24px] border-4 border-white shadow-lg animate-bounce-in-loop" style={{ animationDelay: "0.5s" }}>
                    <span className="text-[36px] font-bold text-white">3</span>
                  </div>
                  <h4 className="text-[20px] font-extrabold text-[#1b1c1a] mb-[12px]">
                    Meet & Connect
                  </h4>
                  <p className="text-[16px] text-[#697969]">
                    Your squad instantly connects with another. Exchange stories, ideas, or even add friends for life. Skip anytime.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Promise Section */}
          <section className="py-[96px]">
            <div className="max-w-[1280px] mx-auto px-[32px]">
              <div className="bg-gradient-to-r from-[#516051] to-[#697969] rounded-[16px] p-[64px] text-center text-white animate-fade-in-up-loop hover:shadow-2xl transition-all duration-500">
                <h3 className="text-[48px] font-extrabold mb-[24px] leading-[56px]">
                  <AnimatedText text="Premium Squad Discovery" className="text-[48px] font-extrabold text-white" delay={200} />
                </h3>
                <p className="text-[18px] leading-[28px] mb-[32px] opacity-95 animate-fade-in-up-loop" style={{ animationDelay: "0.3s" }}>
                  Giggle is built for groups who want to meet groups. No solo stranger chats. No doom-scrolling. No performance anxiety about one-on-one connections. Just authentic squad-to-squad encounters with real people, real conversations, and real potential for new friendships.
                </p>
                <p className="text-[16px] opacity-85 italic animate-fade-in-up-loop" style={{ animationDelay: "0.4s" }}>
                  "Because the best conversations happen when your friends are by your side."
                </p>
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="bg-[#f5f3f0] py-[96px]">
            <div className="max-w-[1280px] mx-auto px-[32px] text-center">
              <h3 className="text-[48px] font-extrabold text-[#1b1c1a] leading-[56px] mb-[24px] animate-fade-in-up-loop">
                <AnimatedText text="Ready to Squad up?" className="text-[48px] font-extrabold text-[#1b1c1a]" delay={100} />
              </h3>
              <p className="text-[18px] text-[#697969] mb-[48px] animate-fade-in-up-loop" style={{ animationDelay: "0.3s" }}>
                Sign in with Google to create your first squad. It takes less than 30 seconds.
              </p>
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
                className="animate-fade-in-up-loop"
                style={{ animationDelay: "0.4s" }}
              >
                <button className="px-[40px] py-[16px] bg-gradient-to-br from-[#516051] to-[#697969] text-white rounded-[8px] font-semibold hover:shadow-lg transition-all shadow-md hover:scale-110 active:scale-95 text-[18px]">
                  Get Started
                </button>
              </form>
            </div>
          </section>
        </main>
      ) : (
        <LobbyClient
          backendToken={session.backendToken || ""}
          userName={session.user?.name || "User"}
          userImage={session.user?.image}
        />
      )}
    </>
  );
}