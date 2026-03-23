import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 font-sans">
      <h1 className="text-5xl font-bold mb-4 tracking-tighter">Giggle</h1>
      <p className="text-gray-500 mb-8 font-mono">v0.1.0-alpha</p>

      {!session ? (
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black rounded-full font-semibold transition-transform hover:scale-105">
            Sign in with Google
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <img 
            src={session.user?.image || ""} 
            alt="Profile" 
            className="w-16 h-16 rounded-full border-2 border-black"
          />
          <h2 className="text-2xl font-semibold">Hey, {session.user?.name}!</h2>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="text-sm text-red-500 underline underline-offset-4">
              Sign Out
            </button>
          </form>
        </div>
      )}
    </main>
  );
}