export interface ProjectHighlight {
  title: string;
  description: string;
}

export interface BrandingResult {
  executiveSummary: string; // Renamed from summary
  professionalBio: string;  // New: longer, detailed bio
  keyAchievements: string[]; // Renamed from impact
  coreExpertise: string[];  // New: list of expertise/skills
  professionalPhilosophy: string; // New: professional philosophy/values
  visionAndOutlook: string; // New: vision and future goals
  projectHighlights: ProjectHighlight[]; // New: array of project highlights
  language: 'en' | 'ar' | 'so'; 
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