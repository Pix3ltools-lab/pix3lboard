'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { Header } from '@/components/layout/Header';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Spinner } from '@/components/ui/Spinner';
import { MetricCard } from '@/components/analytics/MetricCard';
import { CardsByListChart } from '@/components/analytics/CardsByListChart';
import { CardsByTypeChart } from '@/components/analytics/CardsByTypeChart';
import { ThroughputChart } from '@/components/analytics/ThroughputChart';
import { LeadTimeChart } from '@/components/analytics/LeadTimeChart';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ArrowLeft, LayoutDashboard, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  period: { from: string; to: string };
  summary: {
    totalCards: number;
    overdueCards: number;
    completedInPeriod: number;
    avgLeadTimeDays: number | null;
  };
  cardsByList: Array<{ list_name: string; count: number }>;
  cardsByType: Array<{ type: string; count: number }>;
  cardsByPriority: Array<{ priority: string; count: number }>;
  throughput: Array<{ date: string; created: number }>;
  createdVsCompleted: Array<{ week: string; created: number; archived: number }>;
  leadTime: Array<{ card_id: string; title: string; lead_time_days: number }>;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AnalyticsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const boardId = params.boardId as string;

  const { getWorkspace, getBoard, isInitialized } = useData();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(today());

  const workspace = getWorkspace(workspaceId);
  const board = getBoard(boardId);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/analytics?from=${fromDate}&to=${toDate}`);
      if (!res.ok) {
        throw new Error(res.status === 403 ? 'Access denied' : 'Failed to load analytics');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [boardId, fromDate, toDate]);

  useEffect(() => {
    if (isInitialized) {
      fetchAnalytics();
    }
  }, [isInitialized, fetchAnalytics]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!workspace || !board) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary">Board not found</p>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: workspace.name, href: `/workspace/${workspaceId}` },
    { label: board.name, href: `/workspace/${workspaceId}/board/${boardId}` },
    { label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex items-center justify-between mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/workspace/${workspaceId}/board/${boardId}`}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-accent-primary" />
              <h1 className="text-xl font-bold text-text-primary">Analytics</h1>
            </div>
          </div>
          <DateRangeSelector
            from={fromDate}
            to={toDate}
            onChange={(f, t) => { setFromDate(f); setToDate(t); }}
          />
        </div>

        {error && (
          <div className="bg-accent-danger/10 text-accent-danger px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Cards"
                value={data.summary.totalCards}
                icon={Layers}
                color="blue"
              />
              <MetricCard
                title="Completed"
                value={data.summary.completedInPeriod}
                subtitle="in period"
                icon={CheckCircle2}
                color="green"
              />
              <MetricCard
                title="Avg Lead Time"
                value={data.summary.avgLeadTimeDays !== null ? `${data.summary.avgLeadTimeDays}d` : '-'}
                subtitle="creation to archive"
                icon={Clock}
                color="purple"
              />
              <MetricCard
                title="Overdue"
                value={data.summary.overdueCards}
                icon={AlertTriangle}
                color={data.summary.overdueCards > 0 ? 'red' : 'green'}
              />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardsByListChart data={data.cardsByList} />
              <CardsByTypeChart data={data.cardsByType} />
            </div>

            {/* Throughput chart */}
            <ThroughputChart data={data.createdVsCompleted} />

            {/* Lead time chart */}
            <LeadTimeChart data={data.leadTime} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
