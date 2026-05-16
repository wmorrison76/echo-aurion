/**
 * Tab Navigation Layout
 * Bottom tab navigation for main app screens
 * Weeks 9-10 Implementation
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScheduleScreen from './schedule';
import ClockingScreen from './clocking';
import MessagesScreen from './messages';
import AvatarScreen from './avatar';
import OrdersScreen from './orders';
import ProfileScreen from './profile';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e5e7eb',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      {/* Schedule Tab */}
      <Tab.Screen
        name="schedule"
        component={ScheduleScreen}
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />

      {/* Clocking Tab */}
      <Tab.Screen
        name="clocking"
        component={ClockingScreen}
        options={{
          title: 'Time Tracking',
          tabBarLabel: 'Clock',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clock" color={color} size={size} />
          ),
        }}
      />

      {/* Orders Tab */}
      <Tab.Screen
        name="orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package" color={color} size={size} />
          ),
        }}
      />

      {/* Avatar Tab */}
      <Tab.Screen
        name="avatar"
        component={AvatarScreen}
        options={{
          title: 'Avatar',
          tabBarLabel: 'Avatar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" color={color} size={size} />
          ),
        }}
      />

      {/* Messages Tab */}
      <Tab.Screen
        name="messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message" color={color} size={size} />
          ),
          tabBarBadge: 3,
        }}
      />

      {/* Profile Tab */}
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
