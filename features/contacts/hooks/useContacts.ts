import { useCallback, useEffect } from "react";

import { useContactsStore } from "@/features/contacts/store/contacts.store";
import { fetchSiteContacts } from "@/features/contacts/services/contacts.service";

export const useContacts = () => {
  const {
    list,
    loading,
    error,
    bootstrapped,
    setContacts,
    setError,
    setLoading,
    setBootstrapped,
  } = useContactsStore();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const result = await fetchSiteContacts();
    if (result.ok) {
      setContacts(result.value);
      setError(undefined);
    } else {
      setError(result.error);
    }
    setBootstrapped(true);
    setLoading(false);
  }, [setBootstrapped, setContacts, setError, setLoading]);

  useEffect(() => {
    if (!bootstrapped) {
      fetchContacts();
    }
  }, [bootstrapped, fetchContacts]);

  return { contacts: list, loading, error, refetch: fetchContacts };
};
