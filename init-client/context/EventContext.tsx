// context/EventContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface EventContextType {
  currentEventId: number | null;
  setCurrentEventId: (id: number) => void;
}

const EventContext = createContext<EventContextType | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);

  return (
    <EventContext.Provider value={{ currentEventId, setCurrentEventId }}>
      {children}
    </EventContext.Provider>
  );
}

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvent doit être dans EventProvider');
  return context;
};
