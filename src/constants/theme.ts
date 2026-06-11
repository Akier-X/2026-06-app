import { useColorScheme } from 'react-native';

export interface ThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  card: string;
  cardPressed: string;
  border: string;
  primary: string;
  primarySoft: string;
  accent: string;
  danger: string;
  success: string;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#1F2A28',
    textSecondary: '#5E6E6A',
    background: '#F7F5F0',
    card: '#FFFFFF',
    cardPressed: '#EFEDE6',
    border: '#E4E1D8',
    primary: '#3E8E75',
    primarySoft: '#DCEEE7',
    accent: '#E8A04C',
    danger: '#C9554E',
    success: '#3E8E75',
  },
  dark: {
    text: '#ECEAE4',
    textSecondary: '#9BA8A4',
    background: '#15201D',
    card: '#1E2C28',
    cardPressed: '#273733',
    border: '#2C3B36',
    primary: '#5BA88E',
    primarySoft: '#24382F',
    accent: '#E8A04C',
    danger: '#D9756F',
    success: '#5BA88E',
  },
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  full: 999,
} as const;
