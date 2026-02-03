// hooks/useMatches.ts (NOUVEAU)
import { createContext, useContext, useState } from 'react';
import { matchService, Match } from '@/services/match.service';

interface MatchesContextType {
  refreshMatches: (eventId: number) => Promise<void>;
  matches: Match[];
}

const MatchesContext = createContext<MatchesContextType | null>(null);

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);

  const refreshMatches = async (eventId: number) => {
    const data = await matchService.getEventMatches(eventId);
    setMatches(data);
  };

  return (
    <MatchesContext.Provider value={{ refreshMatches, matches }}>
      {children}
    </MatchesContext.Provider>
  );
}

export const useMatches = () => {
  const context = useContext(MatchesContext);
  if (!context) throw new Error('useMatches doit être dans MatchesProvider');
  return context;
};
