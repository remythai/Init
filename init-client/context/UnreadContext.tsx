import { createContext, useContext, useCallback, useRef } from 'react';

type RefreshFn = () => void;

const UnreadContext = createContext<{
  refreshUnread: () => void;
  registerRefresh: (fn: RefreshFn) => void;
}>({
  refreshUnread: () => {},
  registerRefresh: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const fnRef = useRef<RefreshFn>(() => {});

  const registerRefresh = useCallback((fn: RefreshFn) => {
    fnRef.current = fn;
  }, []);

  const refreshUnread = useCallback(() => {
    fnRef.current();
  }, []);

  return (
    <UnreadContext.Provider value={{ refreshUnread, registerRefresh }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);
