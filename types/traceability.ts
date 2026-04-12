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
