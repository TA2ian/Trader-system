import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import CryptoJS from "crypto-js";

export const backupService = {
  // Encrypted JSON Export
  encryptAndExport(data: any, password: string) {
    const jsonStr = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonStr, password).toString();
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.enc`;
    a.click();
  },

  // Decrypted JSON Import
  decryptAndImport(fileContent: string, password: string): any {
    const bytes = CryptoJS.AES.decrypt(fileContent, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  },

  // Firestore Cloud Snapshot
  async createCloudSnapshot(data: any) {
    const backupsCollection = collection(db, 'backups');
    await addDoc(backupsCollection, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};
