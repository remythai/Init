'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { UnreadMessagesProvider } from '../contexts/UnreadMessagesContext';
import { LangProvider } from '../contexts/LangContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LangProvider>
        <UnreadMessagesProvider>
          {children}
        </UnreadMessagesProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
