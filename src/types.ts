export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  completed: boolean;
}

export interface SummaryResult {
  id: string;
  timestamp: number;
  originalText: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  blockers: string[];
}
