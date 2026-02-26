'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Activity, Wifi, MessageSquare, Users, Clock, Cpu, HardDrive, TrendingUp, TrendingDown,
} from 'lucide-react';

// Mock data for monitoring
const metrics = [
    { label: 'Messages/sec', value: '1,247', trend: '+12%', up: true, icon: MessageSquare },
    { label: 'Active connections', value: '312', trend: '+3%', up: true, icon: Wifi },
    { label: 'API latency (p95)', value: '42ms', trend: '-8%', up: false, icon: Clock },
    { label: 'Error rate', value: '0.02%', trend: '-15%', up: false, icon: Activity },
];

const services = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.99%', latency: '12ms' },
    { name: 'Auth Service', status: 'healthy', uptime: '99.98%', latency: '8ms' },
    { name: 'Chat Service', status: 'healthy', uptime: '99.97%', latency: '15ms' },
    { name: 'Compliance Service', status: 'healthy', uptime: '99.95%', latency: '22ms' },
    { name: 'MongoDB', status: 'healthy', uptime: '99.99%', latency: '3ms' },
    { name: 'Redis', status: 'healthy', uptime: '100%', latency: '1ms' },
    { name: 'Kafka', status: 'healthy', uptime: '99.99%', latency: '5ms' },
];

export default function MonitoringPage() {
    const [lastRefresh, setLastRefresh] = React.useState(new Date());

    React.useEffect(() => {
        const iv = setInterval(() => setLastRefresh(new Date()), 10000);
        return () => clearInterval(iv);
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Real-time Monitoring</h1>
                    <p className="mt-1 text-muted-foreground">Live infrastructure health and performance metrics.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live — Updated {lastRefresh.toLocaleTimeString()}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((m) => (
                    <Card key={m.label}>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <m.icon className="h-5 w-5 text-muted-foreground" />
                                <div className={`flex items-center gap-1 text-xs ${m.label.includes('latency') || m.label.includes('Error') ? (m.up ? 'text-red-500' : 'text-emerald-500') : (m.up ? 'text-emerald-500' : 'text-red-500')}`}>
                                    {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {m.trend}
                                </div>
                            </div>
                            <p className="text-2xl font-bold tracking-tight">{m.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Service Health */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        Service Health
                    </CardTitle>
                    <CardDescription>Current status of all infrastructure components.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Service</th>
                                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Uptime</th>
                                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Latency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {services.map((s) => (
                                    <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-4 font-medium">{s.name}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="success" className="gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">{s.uptime}</td>
                                        <td className="py-3 px-4 font-mono text-muted-foreground">{s.latency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Resource Usage */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-primary" /> CPU Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: 'API Gateway', usage: 32 },
                                { name: 'Auth Service', usage: 18 },
                                { name: 'Chat Service', usage: 45 },
                            ].map((s) => (
                                <div key={s.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">{s.name}</span>
                                        <span className="font-medium">{s.usage}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${s.usage > 80 ? 'bg-red-500' : s.usage > 60 ? 'bg-amber-500' : 'bg-primary'}`}
                                            style={{ width: `${s.usage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-primary" /> Memory Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: 'MongoDB', usage: 54 },
                                { name: 'Redis', usage: 28 },
                                { name: 'Kafka', usage: 37 },
                            ].map((s) => (
                                <div key={s.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">{s.name}</span>
                                        <span className="font-medium">{s.usage}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${s.usage > 80 ? 'bg-red-500' : s.usage > 60 ? 'bg-amber-500' : 'bg-primary'}`}
                                            style={{ width: `${s.usage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
