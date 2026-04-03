import { auth, signIn } from "@/auth";
import { LobbyClient } from "@/components/lobby/LobbyClient";

export default async function Home() {
  const session = await auth();

  return (
    <>
      {!session ? (
        <main className="flex flex-col items-center justify-center min-h-screen p-8 font-sans bg-slate-100">
          <h1 className="text-5xl font-bold mb-4 tracking-tighter">Giggle</h1>
          <p className="text-gray-600 mb-8">Squad-first random meets</p>

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
            <button className="px-8 py-3 bg-black text-white rounded-full font-semibold transition-transform hover:scale-105">
            Sign in with Google
          </button>
        </form>
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