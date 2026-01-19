# Client Facing UI - Analytics Implementation

> **Parent Roadmap**: [Client Facing UI](../../roadmaps/1_clientFacingUI.md)

---

## Overview

Usage analytics dashboard for SAAS clients to monitor their chat application.

---

## 1. Analytics Dashboard Components

```typescript
interface AnalyticsDashboard {
  // Time-based metrics
  messages: TimeSeriesData[];
  activeUsers: TimeSeriesData[];
  conversations: TimeSeriesData[];
  
  // Summary stats
  totalMessages: number;
  totalUsers: number;
  totalConversations: number;
  
  // Real-time
  currentOnline: number;
  messageRate: number;  // per minute
  
  // Top lists
  topUsers: UserStats[];
  topConversations: ConversationStats[];
}
```

---

## 2. API Endpoints

```typescript
// GET /api/analytics/dashboard
router.get('/analytics/dashboard', async (req, res) => {
  const { startDate, endDate, granularity } = req.query;
  
  const [
    timeSeries,
    summary,
    realtime,
    topLists
  ] = await Promise.all([
    analyticsService.getTimeSeries(req.tenantId, { startDate, endDate, granularity }),
    analyticsService.getSummary(req.tenantId, { startDate, endDate }),
    analyticsService.getRealtime(req.tenantId),
    analyticsService.getTopLists(req.tenantId, { startDate, endDate })
  ]);
  
  res.json({
    timeSeries,
    summary,
    realtime,
    topLists
  });
});

// GET /api/analytics/export
router.get('/analytics/export', async (req, res) => {
  const csv = await analyticsService.exportCSV(req.tenantId, req.query);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
  res.send(csv);
});
```

---

## 3. React Components

```tsx
// Analytics Dashboard Page
export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const { data, isLoading } = useAnalytics(dateRange);
  
  if (isLoading) return <DashboardSkeleton />;
  
  return (
    <div className="analytics-dashboard">
      <DashboardHeader>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <ExportButton />
      </DashboardHeader>
      
      <StatsGrid>
        <StatCard 
          title="Total Messages" 
          value={data.summary.totalMessages}
          trend={data.summary.messagesTrend}
        />
        <StatCard 
          title="Active Users" 
          value={data.summary.activeUsers}
          trend={data.summary.usersTrend}
        />
        <StatCard 
          title="Conversations" 
          value={data.summary.totalConversations}
          trend={data.summary.conversationsTrend}
        />
        <StatCard 
          title="Online Now" 
          value={data.realtime.currentOnline}
          live
        />
      </StatsGrid>
      
      <ChartSection>
        <MessagesChart data={data.timeSeries.messages} />
        <UsersChart data={data.timeSeries.activeUsers} />
      </ChartSection>
      
      <TablesSection>
        <TopUsersTable data={data.topLists.users} />
        <TopConversationsTable data={data.topLists.conversations} />
      </TablesSection>
    </div>
  );
}
```

---

## 4. Chart Components

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function MessagesChart({ data }: { data: TimeSeriesData[] }) {
  return (
    <div className="chart-container">
      <h3>Messages Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => format(new Date(date), 'MMM d')}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(date) => format(new Date(date), 'PPP')}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="var(--color-primary)" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 5. Real-time Updates

```typescript
// Hook for real-time analytics
function useRealtimeAnalytics(tenantId: string) {
  const [data, setData] = useState<RealtimeMetrics | null>(null);
  
  useEffect(() => {
    const socket = io('/analytics', { auth: { token } });
    
    socket.emit('subscribe', { tenantId });
    
    socket.on('metrics:update', (metrics: RealtimeMetrics) => {
      setData(metrics);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [tenantId]);
  
  return data;
}
```

---

## 6. Data Aggregation

```typescript
// Server-side aggregation
async function getTimeSeries(
  tenantId: string, 
  options: TimeSeriesOptions
): Promise<TimeSeriesData[]> {
  const { startDate, endDate, granularity } = options;
  
  const interval = granularity === 'hour' ? 'hour' : 'day';
  
  const result = await db.query(`
    SELECT 
      date_trunc('${interval}', created_at) as date,
      COUNT(*) as value
    FROM messages
    WHERE tenant_id = $1 
      AND created_at BETWEEN $2 AND $3
    GROUP BY date_trunc('${interval}', created_at)
    ORDER BY date
  `, [tenantId, startDate, endDate]);
  
  return result.rows;
}
```

---

## Related Documents
- [State Management](./state-management.md)
- [Design System](./design-system.md)
