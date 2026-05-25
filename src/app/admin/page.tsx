"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { motion } from "framer-motion";
import { ShieldCheck, UserCheck, Clock } from "lucide-react";
import { BACKEND_API_BASE_URL } from "@/config/appConfig";

export default function AdminPage() {
  const { data: session } = useSession();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchPending = async () => {
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/admin/pending-users`, {
        headers: {
          Authorization: `Bearer ${session?.backendToken}`,
        },
      });
      const data = await res.json();
      if (data.ok) setPendingUsers(data.data);
    } catch (err) {
      console.error("Failed to fetch pending users");
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async (userId: string) => {
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/admin/approve-user/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.backendToken}`,
        },
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u._id !== userId));
        setMessage("User approved successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      alert("Approval failed");
    }
  };

  useEffect(() => {
    if (session?.backendToken) fetchPending();
  }, [session]);

  if (!session || session.user.email !== "himanshu.builds@gmail.com") {
    return <div className="p-20 text-center font-black">ACCESS DENIED</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] dark:bg-gray-950">
      <Navigation />
      <main className="max-w-4xl mx-auto p-4 md:p-10 pt-24 md:pt-32">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 italic">
              <ShieldCheck className="text-[#516051]" size={32} />
              Gatekeeper Panel
            </h1>
            <p className="text-gray-500 mt-2 text-sm">Manage beta access for the Colleague Release.</p>
          </div>
          {message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
              {message}
            </motion.div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.3em] font-black text-gray-400 mb-6 flex items-center gap-2">
            <Clock size={14} />
            Pending Approvals ({pendingUsers.length})
          </h2>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-900 rounded-3xl" />)}
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[40px]">
              <p className="text-gray-400 font-bold">The queue is empty. Everyone is in!</p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <motion.div
                layout
                key={user._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 md:p-6 rounded-[32px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:shadow-xl hover:border-[#516051]/30 transition-all duration-500 gap-4"
              >
                <div className="flex flex-row items-center gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#516051]/10 flex items-center justify-center text-[#516051] font-black shrink-0">
                    {user.name?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => onApprove(user._id)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#516051] hover:bg-black text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shrink-0"
                >
                  <UserCheck size={16} />
                  Grant Access
                </button>
              </motion.div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
