import { db, firebaseLib } from "../lib/firebase";
import { Customer } from "../types";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { auditService } from "./auditService";

const customersCollection = collection(db, 'customers');
const userId = "admin"; // Should be retrieved from AuthContext/User in a real app

export const customerService = {
  async getCustomers(): Promise<Customer[]> {
    if (firebaseLib.isOffline) return this.getLocalCustomers();
    try {
      const q = query(customersCollection, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch (e) {
      console.error("Firestore getCustomers error, using local fallback:", e);
      return this.getLocalCustomers();
    }
  },

  async addCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
    const tempId = Math.random().toString(36).substring(2, 11);
    const newCustomer: Customer = {
        ...customer,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // 1. Optimistic Update: Save locally immediately
    this.saveLocalCustomer(newCustomer);

    // 2. Background Sync: Try to add to Firestore without blocking the UI
    if (!firebaseLib.isOffline) {
        addDoc(customersCollection, {
            ...customer,
            created_at: newCustomer.created_at,
            updated_at: newCustomer.updated_at
        })
        .then((docRef) => {
            // Update local ID to Firestore ID
            this.updateLocalCustomer(tempId, { id: docRef.id });
            auditService.logAction('إضافة عميل', `تم إضافة العميل: ${customer.name}`, userId, docRef.id);
        })
        .catch((e) => {
            console.error("Firestore background addCustomer error:", e);
            // Optionally handle error: remove locally or notify user
        });
    } else {
      auditService.logAction('إضافة عميل (أوفلاين)', `تم إضافة العميل: ${customer.name}`, userId, tempId);
    }
    
    return newCustomer;
  },

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<void> {
    try {
      const customerDoc = doc(db, 'customers', id);
      await updateDoc(customerDoc, { ...customer, updated_at: new Date().toISOString() });
      auditService.logAction('تحديث عميل', `تم تحديث بيانات العميل: ${id}`, userId, id);
    } catch (e) {
      console.error("Firestore updateCustomer error, using local fallback:", e);
      this.updateLocalCustomer(id, customer);
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      const customerDoc = doc(db, 'customers', id);
      await deleteDoc(customerDoc);
      auditService.logAction('حذف عميل', `تم حذف العميل: ${id}`, userId, id);
    } catch (e) {
      console.error("Firestore deleteCustomer error, using local fallback:", e);
      this.deleteLocalCustomer(id);
    }
  },

  deleteLocalCustomer(id: string) {
    const current = this.getLocalCustomers();
    const updated = current.filter(c => c.id !== id);
    try {
      localStorage.setItem('local_customers', JSON.stringify(updated));
    } catch (e) {}
  },

  getLocalCustomers(): Customer[] {
    try {
      const local = localStorage.getItem('local_customers');
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
    const mocks = this.getMockCustomers();
    try {
      localStorage.setItem('local_customers', JSON.stringify(mocks));
    } catch (e) {}
    return mocks;
  },

  saveLocalCustomer(customer: Customer) {
    const current = this.getLocalCustomers();
    const updated = [...current, customer];
    try {
      localStorage.setItem('local_customers', JSON.stringify(updated));
    } catch (e) {}
  },

  updateLocalCustomer(id: string, customer: Partial<Customer>) {
    const current = this.getLocalCustomers();
    const updated = current.map(c => c.id === id ? { ...c, ...customer } : c);
    try {
      localStorage.setItem('local_customers', JSON.stringify(updated));
    } catch (e) {}
  },

  setAllLocalCustomers(customers: Customer[]) {
    try {
      localStorage.setItem('local_customers', JSON.stringify(customers));
    } catch (e) {}
  },

  getMockCustomers(): Customer[] {
    return [
      {
        id: "1",
        company_id: "demo-company",
        name: "أبو محمود - كفرنبل",
        region: "إدلب",
        address: "السوق الرئيسي",
        phone: "0999123456",
        credit_limit: 5000,
        balance_usd: 100
      }
    ];
  },

  async clearAll(): Promise<void> {
    // Firestore deletion for all is more complex, skipping for now
  }
};
