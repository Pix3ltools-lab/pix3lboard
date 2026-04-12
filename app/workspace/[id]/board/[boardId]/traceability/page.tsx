'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { Header } from '@/components/layout/Header';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Spinner } from '@/components/ui/Spinner';
import { CoverageTab } from '@/components/traceability/CoverageTab';
import { MatrixTab } from '@/components/traceability/MatrixTab';
import { RequirementsTab } from '@/components/traceability/RequirementsTab';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Requirement } from '@/types';

type Tab = 'matrix' | 'requirements' | 'coverage';

interface CoverageData {
  metrics: { total: number; covered: number; partial: number; notCovered: number };
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; covered: number; partial: number; notCovered: number }>;
  byList: Array<{ list: string; covered: number; partial: number; notCovered: number }>;
  atRisk: Array<{ id: string; code: string; title: string; status: string; coveragePercent: number }>;
}

export default function TraceabilityPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const boardId = params.boardId as string;

  const { getWorkspace, getBoard, isInitialized } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('matrix');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspace = getWorkspace(workspaceId);
  const board = getBoard(boardId);

  const fetchRequirements = useCallback(async () => {
    setLoadingReqs(true);
    setError(null);
    try {
      const res = await fetch(`/api/requirements?boardId=${boardId}`);
      if (!res.ok) throw new Error(res.status === 403 ? 'Access denied' : 'Failed to load requirements');
      const data = await res.json();
      setRequirements(data.requirements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingReqs(false);
    }
  }, [boardId]);

  const fetchCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/traceability/coverage`);
      if (res.ok) {
        const data = await res.json();
        setCoverageData(data);
      }
    } finally {
      setLoadingCoverage(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isInitialized) {
      fetchRequirements();
    }
  }, [isInitialized, fetchRequirements]);

  // Fetch coverage only when the Coverage tab is active
  useEffect(() => {
    if (activeTab === 'coverage' && isInitialized && !coverageData) {
      fetchCoverage();
    }
  }, [activeTab, isInitialized, coverageData, fetchCoverage]);

  const handleRefresh = useCallback(() => {
    fetchRequirements();
    // Invalidate coverage so it refetches next time the tab is opened
    setCoverageData(null);
  }, [fetchRequirements]);

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
    { label: 'Traceability' },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'matrix', label: 'Matrix' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'coverage', label: 'Coverage' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex items-center gap-3 mt-4 mb-6">
          <Link
            href={`/workspace/${workspaceId}/board/${boardId}`}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent-primary" />
            <h1 className="text-xl font-bold text-text-primary">Traceability</h1>
          </div>
        </div>

        {error && (
          <div className="bg-accent-danger/10 text-accent-danger px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-bg-tertiary mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'matrix' && (
          loadingReqs ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <MatrixTab requirements={requirements} workspaceId={workspaceId} boardId={boardId} />
          )
        )}

        {activeTab === 'requirements' && (
          loadingReqs ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <RequirementsTab boardId={boardId} requirements={requirements} onRefresh={handleRefresh} />
          )
        )}

        {activeTab === 'coverage' && (
          loadingCoverage || !coverageData ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <CoverageTab data={coverageData} />
          )
        )}
      </div>
    </div>
  );
}
