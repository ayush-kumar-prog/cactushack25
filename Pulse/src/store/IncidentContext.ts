import { create } from 'zustand';

export type IncidentStatus = 'SCANNING' | 'ASSESSMENT' | 'CPR_IN_PROGRESS' | 'STABLE';
export type Consciousness = 'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE' | null;

export interface IncidentContextState {
  status: IncidentStatus;
  patient: {
    demographics: string | null;
    consciousness: Consciousness;
    breathing: boolean | null;
    pulse: boolean | null;
  };
  environment: {
    gps: { lat: number; long: number } | null;
    hazards_detected: boolean;
  };
  timeline: {
    incident_start: number;
    cpr_start: number | null;
    last_compression: number | null;
  };

  // Actions
  setStatus: (status: IncidentStatus) => void;
  updatePatient: (updates: Partial<IncidentContextState['patient']>) => void;
  updateEnvironment: (updates: Partial<IncidentContextState['environment']>) => void;
  recordCompression: () => void;
  startCPR: () => void;
}

export const useIncidentContext = create<IncidentContextState>((set) => ({
  status: 'SCANNING',
  patient: {
    demographics: null,
    consciousness: null,
    breathing: null,
    pulse: null,
  },
  environment: {
    gps: null,
    hazards_detected: false,
  },
  timeline: {
    incident_start: Date.now(),
    cpr_start: null,
    last_compression: null,
  },

  setStatus: (status: IncidentStatus) => set({ status }),
  updatePatient: (updates: Partial<IncidentContextState['patient']>) =>
    set((state: IncidentContextState) => ({ patient: { ...state.patient, ...updates } })),
  updateEnvironment: (updates: Partial<IncidentContextState['environment']>) =>
    set((state: IncidentContextState) => ({ environment: { ...state.environment, ...updates } })),
  recordCompression: () =>
    set((state: IncidentContextState) => ({
      timeline: { ...state.timeline, last_compression: Date.now() },
    })),
  startCPR: () =>
    set((state: IncidentContextState) => ({
      status: 'CPR_IN_PROGRESS',
      timeline: { ...state.timeline, cpr_start: Date.now() },
    })),
}));

// Logging Middleware
useIncidentContext.subscribe((state) => {
  console.log(`[IncidentContext] State Update:`, JSON.stringify({
    status: state.status,
    patient: state.patient,
    environment: state.environment
  }, null, 2));
});
