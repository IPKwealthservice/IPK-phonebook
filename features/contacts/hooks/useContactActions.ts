import { useCallback } from "react";
import * as Linking from "expo-linking";

import { Contact } from "@/features/contacts/types";
import { toast } from "@/components/feedback/Toast";
import { useCallStore } from "@/features/phone/store/call.store";

export const useContactActions = () => {
  const startCall = useCallStore((state) => state.startCall);

  const dial = useCallback(
    async (contact: Contact) => {
      if (!contact.phone) {
        toast("No phone number available");
        return;
      }
      const normalized = contact.phone.replace(/\s|[-()]/g, "");
      const url = `tel:${normalized}`;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          startCall(contact.phone);
          await Linking.openURL(url);
        } else {
          toast("Calling not supported on this device");
        }
      } catch {
        toast("Unable to start call");
      }
    },
    [startCall]
  );

  const email = useCallback((contact: Contact) => {
    if (!contact.email) {
      toast("No email available");
      return;
    }
    Linking.openURL(`mailto:${contact.email}`);
  }, []);

  return { dial, email };
};
