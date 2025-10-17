export type AuthTab = 'login' | 'register';

export interface AuthInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export interface AuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
}

export interface AuthTabsProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
}
