import CryptoJS from "crypto-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const ENCRYPTION_KEY =
  "1ed1d4863ca98697c8956ec6b8fa5845cef1d32d2253a5c4fe77ae556f40aa4f";

const encryptedStorage = {
  getItem: (name: string) => {
    const encryptedStr = localStorage.getItem(name);
    if (!encryptedStr) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(
        encryptedStr,
        ENCRYPTION_KEY as string,
      );
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    const encryptedStr = CryptoJS.AES.encrypt(
      value,
      ENCRYPTION_KEY as string,
    ).toString();
    localStorage.setItem(name, encryptedStr);
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

interface UserStore {
  pa: string;
  pn: string;
  ct: "whatsapp" | "email";
  ci_whatsapp: string;
  ci_email: string;
  updateUser: (key: string, value: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      pa: "",
      pn: "",
      ct: "whatsapp",
      ci_whatsapp: "",
      ci_email: "",
      updateUser: (key: string, value: string) =>
        set((state) => ({ ...state, [key]: value })),
    }),
    {
      name: "user",
      storage: createJSONStorage(() => encryptedStorage),
    },
  ),
);
