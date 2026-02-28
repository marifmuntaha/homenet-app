import { Platform, Text } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/auth-context'

export default function AdminTabLayout() {
    const { user } = useAuth()
    if (user?.role !== 1) return null

    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: '#080f1a', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
                headerTintColor: '#f1f5f9',
                headerTitleStyle: { fontWeight: '700', fontSize: 17 },
                tabBarStyle: {
                    backgroundColor: '#0d1117',
                    borderTopWidth: 1,
                    borderTopColor: '#1f2937',
                    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
                    paddingTop: 6,
                    height: Platform.OS === 'ios' ? 88 : 66,
                },
                tabBarActiveTintColor: '#818cf8',
                tabBarInactiveTintColor: '#374151',
                tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="customers"
                options={{
                    title: 'Pelanggan',
                    tabBarLabel: 'Pelanggan',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="invoices"
                options={{
                    title: 'Tagihan',
                    tabBarLabel: 'Tagihan',
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="devices"
                options={{
                    title: 'Perangkat',
                    tabBarLabel: 'Perangkat',
                    tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'Lainnya',
                    tabBarLabel: 'Lainnya',
                    tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    )
}
