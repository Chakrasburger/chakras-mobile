import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/player/MiniPlayer';
import { useSettingsStore } from '../../stores/settingsStore';

const INACTIVE = '#72767D';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: any;
  size?: number;
}) {
  return <Ionicons size={props.size || 24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { theme, accentColor } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicTabBg = theme === 'oled' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(18, 18, 18, 0.85)';

  return (
    <View style={[styles.container, { backgroundColor: dynamicBg }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: accentColor,
          tabBarInactiveTintColor: INACTIVE,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: dynamicTabBg }]} />
            </BlurView>
          ),
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="search" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="musical-notes" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai"
          options={{
            title: 'AI',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="sparkles" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="person" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 65 : 85,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(79, 84, 92, 0.4)',
    elevation: 0,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'android' ? 8 : 28,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 4,
  },
});
