import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface IncomeData {
    month: string
    cash: number
    online: number
}

interface IncomeTrendChartProps {
    data: IncomeData[]
}

export default function IncomeTrendChart({ data }: IncomeTrendChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value)
    }

    const formatMonth = (monthStr: string) => {
        if (!monthStr || !monthStr.includes('-')) return monthStr
        const [month, year] = monthStr.split('-')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        return `${months[parseInt(month) - 1]} ${year.slice(-2)}`
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const cash = payload.find((p: any) => p.dataKey === 'cash')?.value || 0
            const online = payload.find((p: any) => p.dataKey === 'online')?.value || 0
            const total = cash + online

            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    minWidth: '150px'
                }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>
                        {formatMonth(label)}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Online:</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(online)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cash:</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(cash)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>Total:</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(total)}</span>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card h-100 d-flex flex-column">
            <div className="card-header">
                <h2 className="card-title">Tren Pendapatan (6 Bulan Terakhir)</h2>
            </div>
            <div style={{ padding: '24px', width: '100%', flex: 1, minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                            dataKey="month"
                            tickFormatter={formatMonth}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(value) => `Rp ${value / 1000}k`}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="cash"
                            stackId="1"
                            stroke="var(--success)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCash)"
                            animationDuration={1500}
                        />
                        <Area
                            type="monotone"
                            dataKey="online"
                            stackId="1"
                            stroke="var(--warning)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorOnline)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
