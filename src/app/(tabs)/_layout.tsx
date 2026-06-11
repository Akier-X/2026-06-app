import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useThemeColors } from '@/constants/theme';

export default function TabsLayout() {
  const c = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'コーチ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'きろく',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
