export type PersonaType = 'Ruby' | 'Streamer' | 'ContentManager';

export interface RunState {
  id: string;
  activePersona: PersonaType;
  campaignGoal: string;
  platform: 'TikTok' | 'Instagram' | 'X';
  step: string;
  budget_used: number;
}

export interface GenesisEvent {
  id: string;
  timestamp: string;
  agent: string;
  type: 'INFO' | 'ACTION' | 'ERROR' | 'SUCCESS' | 'FINANCE';
  message: string;
  metadata?: any;
}

export interface CFOMetrics {
  humanHours: number;
  modelCost: number;
  gpuCost: number;
  bookedCalls: number;
  revenueEst: number;
  effectiveHourlyRate: number;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  cost: number;
  log: string;
}