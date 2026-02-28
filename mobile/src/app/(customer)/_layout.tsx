import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/auth-context'

export default function CustomerTabLayout() {
    const { user } = useAuth()
    if (user?.role !== 2) return null

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
                    title: 'Dashboard Saya',
                    tabBarLabel: 'Beranda',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="invoices"
                options={{
                    title: 'Tagihan Saya',
                    tabBarLabel: 'Tagihan',
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    )
}
