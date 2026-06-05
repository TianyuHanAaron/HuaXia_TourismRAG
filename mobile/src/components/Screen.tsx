import type { ReactNode } from 'react';

import { AppScreen } from './HuaXiaDesignSystem';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ title, subtitle, children, scroll = true }: Props) {
  return (
    <AppScreen title={title} subtitle={subtitle} scroll={scroll}>
      {children}
    </AppScreen>
  );
}
