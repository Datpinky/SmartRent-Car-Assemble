import React, { createContext, useContext, useMemo, useState } from 'react';

export const ChatWidgetContext = createContext(null);

export function ChatWidgetProvider({ children }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      open,
      setOpen,
      openChat: () => setOpen(true),
      closeChat: () => setOpen(false),
      toggleChat: () => setOpen((o) => !o),
    }),
    [open]
  );
  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>;
}

export function useChatWidget() {
  return useContext(ChatWidgetContext);
}
