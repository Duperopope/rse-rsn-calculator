import { createContext, useContext } from "react";

const AccountSessionContext = createContext(null);

export const AccountSessionProvider = AccountSessionContext.Provider;

export function useAccountSession() {
  return useContext(AccountSessionContext);
}
