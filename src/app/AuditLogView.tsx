import React, { useEffect, useState } from "react";
import { AuditLog } from "../types";
import { auditService } from "../services/auditService";
import { History } from "lucide-react";

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const data = await auditService.getAuditLogs();
      setLogs(data);
      setLoading(false);
    }
    loadLogs();
  }, []);

  if (loading) return <div className="p-4 text-white">جاري تحميل سجل العمليات...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">سجل العمليات (Audit Log)</h2>
      </div>
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <table className="w-full text-right text-sm text-white">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="p-3">التوقيت</th>
              <th className="p-3">الإجراء</th>
              <th className="p-3">التفاصيل</th>
              <th className="p-3">المستخدم</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 font-mono">{new Date(log.timestamp).toLocaleString('ar-SA')}</td>
                <td className="p-3 font-bold">{log.action}</td>
                <td className="p-3">{log.details}</td>
                <td className="p-3">{log.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
