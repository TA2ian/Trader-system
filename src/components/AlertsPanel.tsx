import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar } from "lucide-react";
import { customerService } from "../services/customerService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Customer } from "../types";

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const profile = JSON.parse(localStorage.getItem('company_profile') || '{}');
        const debtLimit = profile.debtLimit || 5000;

        // Check for high debt
        const customers = await customerService.getCustomers();
        const highDebtCustomers = customers.filter(c => c.balance_usd > debtLimit);
        const debtAlerts = highDebtCustomers.map(c => `تنبيه: تجاوز العميل ${c.name} سقف الدين المحدد (${c.balance_usd} USD)`);

        // Check for upcoming payments (reminders)
        const remindersSnapshot = await getDocs(query(collection(db, 'reminders'), where('status', '==', 'pending')));
        const now = new Date();
        const upcomingAlerts: string[] = [];
        remindersSnapshot.forEach(doc => {
            const data = doc.data();
            const dueDate = new Date(data.dueDate);
            const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            if (diffDays >= 0 && diffDays <= 7) {
                upcomingAlerts.push(`تنبيه: اقتراب موعد استحقاق دفعة للعميل ${data.customerId} في ${data.dueDate}`);
            }
        });

        setAlerts([...debtAlerts, ...upcomingAlerts]);
      } catch (e) {
        console.error("Error fetching alerts:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-right space-y-3">
        <h2 className="text-red-400 font-bold flex items-center justify-end gap-2">
            <AlertTriangle className="w-5 h-5" />
            تنبيهات هامة
        </h2>
        {alerts.map((alert, index) => (
            <p key={index} className="text-red-300/80 text-sm">{alert}</p>
        ))}
    </div>
  );
}
