import * as Linking from "expo-linking";
import { useCallback } from "react";

import { toast } from "@/components/feedback/Toast";
import { placeDirectCall } from "@/core/utils/directCall";
import { Contact } from "@/features/contacts/types";
import { useCallStore } from "@/features/phone/store/call.store";

export const useContactActions = () => {
  const startCall = useCallStore((state) => state.startCall);

  const dial = useCallback(
    async (contact: Contact) => {
      if (!contact.phone) {
        toast("No phone number available");
        return;
      }
      
      try {
        // Record the call attempt in store
        startCall(contact.phone);
        
        // Place direct call - this will initiate the call immediately
        const success = await placeDirectCall(contact.phone);
        
        if (!success) {
          toast("Unable to start call");
        }
      } catch (error) {
        console.error("Error initiating call:", error);
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
