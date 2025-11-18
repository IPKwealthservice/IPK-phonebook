import { create } from "zustand";

import { Contact } from "@/features/contacts/types";

type ContactsState = {
  list: Contact[];
  loading: boolean;
  error?: string;
  bootstrapped: boolean;
  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (message?: string) => void;
  setBootstrapped: (ready: boolean) => void;
  clear: () => void;
};

export const useContactsStore = create<ContactsState>((set) => ({
  list: [],
  loading: false,
  error: undefined,
  bootstrapped: false,
  setContacts: (list) => set({ list }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  clear: () => set({ list: [], loading: false, error: undefined, bootstrapped: false })
}));
