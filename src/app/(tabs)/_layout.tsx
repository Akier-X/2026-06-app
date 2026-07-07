import { Tabs } from 'expo-router';

import InkIcon, { type InkIconName } from '@/components/art/InkIcon';
import { Fonts, useThemeColors } from '@/constants/theme';

function tabIcon(name: InkIconName) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <InkIcon name={name} size={25} color={color} strokeWidth={focused ? 2.3 : 1.7} />;
  };
}

export default function TabsLayout() {
  const c = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
        headerTitleStyle: { fontFamily: Fonts.display, fontSize: 18, color: c.text, letterSpacing: 2 },
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          headerShown: false,
          tabBarIcon: tabIcon('sun'),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'コーチ',
          tabBarIcon: tabIcon('speechLeaf'),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'きろく',
          tabBarIcon: tabIcon('journal'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: tabIcon('sliders'),
        }}
      />
    </Tabs>
  );
}
