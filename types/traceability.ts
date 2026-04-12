export type RequirementPriority = 'high' | 'medium' | 'low';
export type RequirementStatus = 'draft' | 'approved' | 'implemented' | 'verified';
export type TestType = 'manual' | 'automated';
export type TestResult = 'passed' | 'failed' | 'pending';

export interface Requirement {
  id: string;
  boardId: string;
  code: string;
  title: string;
  description?: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields (populated via JOIN queries)
  linkedCardIds?: string[];
  testCases?: TestCase[];
  coveragePercent?: number;
}

export interface TestCase {
  id: string;
  boardId: string;
  code: string;
  title: string;
  description?: string;
  type: TestType;
  requirementId?: string;
  cardId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  latestRun?: TestRun;
  latestResult?: TestResult;
}

export interface TestRun {
  id: string;
  testCaseId: string;
  result: TestResult;
  notes?: string;
  executedBy: string;
  executedAt: string;
}

// Raw export/import shapes (flat, no computed fields)
export interface TraceabilityRequirement {
  id: string; boardId: string; code: string; title: string;
  description?: string; priority: string; status: string;
  createdBy: string; createdAt: string; updatedAt: string;
}

export interface TraceabilityRequirementCard {
  requirementId: string; cardId: string; createdAt: string;
}

export interface TraceabilityTestCase {
  id: string; boardId: string; code: string; title: string;
  description?: string; type: string; requirementId?: string;
  cardId?: string; createdBy: string; createdAt: string; updatedAt: string;
}

export interface TraceabilityTestRun {
  id: string; testCaseId: string; result: string;
  notes?: string; executedBy: string; executedAt: string;
}

export interface TraceabilityExport {
  requirements: TraceabilityRequirement[];
  requirementCards: TraceabilityRequirementCard[];
  testCases: TraceabilityTestCase[];
  testRuns: TraceabilityTestRun[];
}
