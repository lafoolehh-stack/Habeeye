export interface BrandingResult {
  summary: string;
  bio: string;
  impact: string[];
}

export interface FactCheckSource {
  title: string;
  uri: string;
}

export interface FactCheckResult {
  analysis: string;
  sources: FactCheckSource[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export enum Tab {
  INPUT = 'INPUT',
  BRANDING = 'BRANDING',
  FACT_CHECK = 'FACT_CHECK'
}