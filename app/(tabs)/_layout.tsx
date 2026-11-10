
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '@/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === 'android' ? { minHeight: 64 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      {/* HOME TAB */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={
                focused
                  ? colors.action
                  : colors.textSecondary
              }
              accessible={false}
              importantForAccessibility="no"
            />
          ),
        }}
      />

      {/* TRAIN TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'barbell' : 'barbell-outline'}
              size={size}
              color={
                focused
                  ? colors.action
                  : colors.textSecondary
              }
              accessible={false}
              importantForAccessibility="no"
            />
          ),
        }}
      />

      {/* PROGRESS TAB */}
      <Tabs.Screen
        name="ai-coach"
        options={{
          title: 'AI Coach',
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={size}
              color={focused ? colors.action : colors.textSecondary}
              accessible={false}
              importantForAccessibility="no"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={size}
              color={
                focused
                  ? colors.action
                  : colors.textSecondary
              }
              accessible={false}
              importantForAccessibility="no"
            />
          ),
        }}
      />
      {/* PROFILE TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={
                focused
                  ? colors.action
                  : colors.textSecondary
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}

