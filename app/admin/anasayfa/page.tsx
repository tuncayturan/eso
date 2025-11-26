"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import {
  Loader2,
  Bell,
  Users,
  MonitorSmartphone,
  Clock,
  FileText,
  LineChart as ChartIcon,
  LayoutDashboard,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    announcements: 0,
    users: 0,
    devices: 0,
  });

  const [lastUser, setLastUser] = useState<{
    name?: string;
    email?: string;
    role?: string;
  } | null>(null);

  const [recentLogs, setRecentLogs] = useState<
    { id: string; name?: string; email?: string; role?: string; timestamp?: any; date?: string }[]
  >([]);

  const [chartData, setChartData] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const annSnap = await getDocs(collection(db, "announcements"));

        const veliQuery = query(collection(db, "users"), where("role", "==", "veli"));
        const veliSnap = await getDocs(veliQuery);

        const devSnap = await getDocs(collection(db, "deviceTokens"));
        const uniqueDevices = new Set(
          devSnap.docs.map((d) => {
            const data = d.data();
            return data.ua || data.userId;
          })
        ).size;

        const logQueryLast = query(
          collection(db, "logs"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const lastSnap = await getDocs(logQueryLast);
        const lastData = !lastSnap.empty ? lastSnap.docs[0].data() : null;

        const logQuery = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(5));
        const logSnap = await getDocs(logQuery);
        const logs = logSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const rangeQuery = query(
          collection(db, "logs"),
          where("timestamp", ">=", sevenDaysAgo)
        );
        const rangeSnap = await getDocs(rangeQuery);
        const raw = rangeSnap.docs.map((d) => ({ ...d.data() })) as any[];

        const dayMap: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(sevenDaysAgo.getDate() + i);
          const dayStr = d.toLocaleDateString("tr-TR", { weekday: "short" });
          dayMap[dayStr] = 0;
        }

        raw.forEach((r) => {
          const t = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.date);
          const dayStr = t.toLocaleDateString("tr-TR", { weekday: "short" });
          if (dayMap[dayStr] !== undefined) dayMap[dayStr]++;
        });

        const chartArray = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

        setStats({
          announcements: annSnap.size,
          users: veliSnap.size,
          devices: uniqueDevices,
        });

        setChartData(chartArray);
        setLastUser(lastData as { name?: string; email?: string; role?: string });
        setRecentLogs(logs as any[]);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ios-blue dark:text-ios-teal" />
          <span className="text-ios-gray dark:text-gray-400 font-medium">
            Veriler yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  const lastUserLabel = lastUser
    ? `${lastUser.name || lastUser.email || "—"}${
        lastUser.role
          ? ` (${lastUser.role === "idareci"
              ? "İdareci"
              : lastUser.role === "ogretmen"
              ? "Öğretmen"
              : lastUser.role === "veli"
              ? "Veli"
              : ""
            })`
          : ""
      }`
    : "—";

  const cards = [
    {
      title: "Toplam Duyuru",
      value: stats.announcements,
      icon: <Bell className="w-6 h-6" />,
      color: "from-blue-500 to-blue-700",
    },
    {
      title: "Veli Sayısı",
      value: stats.users,
      icon: <Users className="w-6 h-6" />,
      color: "from-green-500 to-green-700",
    },
    {
      title: "Cihaz Sayısı",
      value: stats.devices,
      icon: <MonitorSmartphone className="w-6 h-6" />,
      color: "from-amber-500 to-amber-700",
    },
    {
      title: "Son Giriş Yapan",
      value: lastUserLabel,
      icon: <Clock className="w-6 h-6" />,
      color: "from-purple-500 to-purple-700",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <LayoutDashboard className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Anasayfa
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Sistem istatistikleri ve son aktiviteler
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="ios-card p-6 flex items-center justify-between 
                     group hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-200"
          >
            <div className="flex-1">
              <p className="text-xs font-medium text-ios-gray dark:text-gray-400 mb-2 uppercase tracking-wide">
                {card.title}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
                {card.value}
              </h2>
            </div>
            <div className="ml-4 p-4 rounded-ios-lg bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                          dark:from-ios-blue/20 dark:to-ios-indigo/20
                          border border-ios-blue/20 dark:border-ios-blue/30
                          group-hover:scale-110 transition-transform">
              <div className="text-ios-blue dark:text-ios-teal">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ios-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <ChartIcon className="w-5 h-5 text-ios-blue dark:text-ios-teal" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Son 7 Gün Giriş Sayısı
            </h2>
            <p className="text-xs text-ios-gray dark:text-gray-400">
              Günlük kullanıcı giriş istatistikleri
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="currentColor" 
              className="text-gray-200 dark:text-gray-700" 
            />
            <XAxis 
              dataKey="day" 
              tick={{ fill: "currentColor" }} 
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              tick={{ fill: "currentColor" }} 
              allowDecimals={false}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: "white",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(20px)",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--ios-blue)"
              strokeWidth={3}
              dot={{ fill: "var(--ios-blue)", r: 5 }}
              activeDot={{ r: 7, fill: "var(--ios-blue)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="ios-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                          dark:from-ios-blue/20 dark:to-ios-indigo/20
                          border border-ios-blue/20 dark:border-ios-blue/30">
              <FileText className="w-5 h-5 text-ios-blue dark:text-ios-teal" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Son Giriş Kayıtları
              </h2>
              <p className="text-xs text-ios-gray dark:text-gray-400">
                Son {recentLogs.length} kullanıcı girişi
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                  Ad Soyad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                  E-posta
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                  Giriş Zamanı
                </th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100/50 dark:border-gray-700/30 
                              hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {log.name || "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.email || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                     bg-ios-blue/10 dark:bg-ios-blue/20
                                     text-ios-blue dark:text-ios-teal
                                     border border-ios-blue/20 dark:border-ios-blue/30">
                        {log.role === "idareci"
                          ? "İdareci"
                          : log.role === "ogretmen"
                          ? "Öğretmen"
                          : log.role === "veli"
                          ? "Veli"
                          : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {log.timestamp?.toDate
                        ? log.timestamp.toDate().toLocaleString("tr-TR")
                        : log.date
                        ? new Date(log.date).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-ios-gray dark:text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Henüz giriş kaydı bulunmuyor
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
