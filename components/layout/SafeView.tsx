import { SafeAreaView } from 'react-native-safe-area-context';

import type { ViewProps } from 'react-native';

interface SafeViewProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function SafeView({ children, className = '', ...props }: SafeViewProps) {
  return (
    <SafeAreaView className={`flex-1 bg-slate-50 ${className}`} {...props}>
      {children}
    </SafeAreaView>
  );
}
