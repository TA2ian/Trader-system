import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { AuditLog } from "../types";

const auditCollection = collection(db, 'audit_logs');

export const auditService = {
  async logAction(action: string, details: string, userId: string, customerId?: string) {
    try {
      await addDoc(auditCollection, {
        action,
        details,
        userId,
        customerId,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error logging action:", e);
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const q = query(auditCollection, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    } catch (e) {
      console.error("Error getting audit logs:", e);
      return [];
    }
  }
};
