export type VerificationStatus = 'idle' | 'analyzing' | 'challenge' | 'verified' | 'failed';

export type ChallengeType = 'grid' | 'slider' | 'audio' | 'none';

export type SecurityLevel = 'standard' | 'strict' | 'paranoia';

export interface MousePoint {
  x: number;
  y: number;
  time: number;
}

export interface TelemetryData {
  points: MousePoint[];
  totalDistance: number;
  averageSpeed: number;
  straightnessRatio: number; // 1 = perfect straight line (likely bot), <0.85 = curved/human
  jitterScore: number;
  timeTakenMs: number;
  humanConfidence: number; // 0 to 100
}

export interface GridTile {
  id: number;
  label: string;
  category: string;
  hasTarget: boolean;
  color: string;
  iconName: string;
}

export interface ImageChallenge {
  id: string;
  targetCategory: string;
  title: string;
  description: string;
  tiles: GridTile[];
}
