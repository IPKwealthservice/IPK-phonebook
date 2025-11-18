import { act, render } from "@testing-library/react-native";

import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { ContactsScreen } from "@/features/contacts/screens/ContactsScreen";
import { useContactsStore } from "@/features/contacts/store/contacts.store";
import { Contact } from "@/features/contacts/types";

jest.mock("@/features/contacts/hooks/useContacts", () => ({
  useContacts: () => ({
    contacts: useContactsStore.getState().list,
    loading: useContactsStore.getState().loading,
    error: useContactsStore.getState().error,
    refetch: jest.fn()
  })
}));

describe("ContactsScreen", () => {
beforeEach(() => {
  useContactsStore.setState({ list: [], loading: false, error: undefined, bootstrapped: false });
});

  it("renders contacts", async () => {
    const contacts: Contact[] = [
      { id: "1", displayName: "John Doe", phone: "1234567890" },
      { id: "2", displayName: "Jane Roe", phone: "5554443322" }
    ];

    await act(async () => {
      useContactsStore.setState({ list: contacts });
    });

    const { getByText } = render(
      <ThemeProvider>
        <ContactsScreen />
      </ThemeProvider>
    );

    expect(getByText("John Doe")).toBeTruthy();
    expect(getByText("Jane Roe")).toBeTruthy();
  });
});
