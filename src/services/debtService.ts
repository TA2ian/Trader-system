import { db } from "../lib/firebase";
import { Debt } from "../types";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const debtsCollection = collection(db, 'debts');

export const debtService = {
  async getDebts(): Promise<Debt[]> {
    try {
      const q = query(debtsCollection, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
    } catch (e) {
      console.error("Firestore getDebts error, using local fallback:", e);
      return this.getLocalDebts();
    }
  },

  async addDebt(debt: Omit<Debt, "id" | "created_at" | "updated_at">): Promise<Debt> {
    try {
      const docRef = await addDoc(debtsCollection, {
        ...debt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return { ...debt, id: docRef.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Debt;
    } catch (e) {
      console.error("Firestore addDebt error, using local fallback:", e);
      const newDebt: Debt = {
        ...debt,
        id: Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.saveLocalDebt(newDebt);
      return newDebt;
    }
  },

  async updateDebt(id: string, debt: Partial<Debt>): Promise<void> {
    try {
      const debtDoc = doc(db, 'debts', id);
      await updateDoc(debtDoc, { ...debt, updated_at: new Date().toISOString() });
    } catch (e) {
      console.error("Firestore updateDebt error, using local fallback:", e);
      this.updateLocalDebt(id, debt);
    }
  },

  async deleteDebt(id: string): Promise<void> {
    try {
      const debtDoc = doc(db, 'debts', id);
      await deleteDoc(debtDoc);
    } catch (e) {
      console.error("Firestore deleteDebt error, using local fallback:", e);
      this.deleteLocalDebt(id);
    }
  },

  getLocalDebts(): Debt[] {
    try {
      const local = localStorage.getItem('local_debts');
      if (local) {
        try {
          return JSON.parse(local);
        } catch (e) {
          // failed to parse
        }
      }
    } catch (e) {
      console.warn("localStorage not available", e);
    }
    const mocks = this.getMockDebts();
    try {
      localStorage.setItem('local_debts', JSON.stringify(mocks));
    } catch (e) {}
    return mocks;
  },

  saveLocalDebt(debt: Debt) {
    const current = this.getLocalDebts();
    const updated = [debt, ...current];
    try {
      localStorage.setItem('local_debts', JSON.stringify(updated));
    } catch (e) {}
  },

  updateLocalDebt(id: string, debt: Partial<Debt>) {
    const current = this.getLocalDebts();
    const updated = current.map(d => d.id === id ? { ...d, ...debt } : d);
    try {
      localStorage.setItem('local_debts', JSON.stringify(updated));
    } catch (e) {}
  },

  deleteLocalDebt(id: string) {
    const current = this.getLocalDebts();
    const updated = current.filter(d => d.id !== id);
    try {
      localStorage.setItem('local_debts', JSON.stringify(updated));
    } catch (e) {}
  },

  setAllLocalDebts(debts: Debt[]) {
    try {
      localStorage.setItem('local_debts', JSON.stringify(debts));
    } catch (e) {}
  },

  getMockDebts(): Debt[] {
    return [
      {
        id: "1",
        company_id: "demo-company",
        clientName: "أبو محمود كفرنبل",
        amount: 100, // 100 USD
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  },

  async clearAll(): Promise<void> {
    // Firestore deletion for all is more complex, skipping for now
  }
};
