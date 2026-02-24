'use client';

import { ReactNode } from 'react';
import { UnreadMessagesProvider } from '../contexts/UnreadMessagesContext';
import { LangProvider } from '../contexts/LangContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <UnreadMessagesProvider>
        {children}
      </UnreadMessagesProvider>
    </LangProvider>
  );
}
