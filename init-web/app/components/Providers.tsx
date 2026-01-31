'use client';

import { ReactNode } from 'react';
import { UnreadMessagesProvider } from '../contexts/UnreadMessagesContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UnreadMessagesProvider>
      {children}
    </UnreadMessagesProvider>
  );
}
