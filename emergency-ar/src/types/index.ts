export interface Message {
  role: 'User' | 'Assistant';
  text: string;
}

export interface MarkerPosition {
  x: number;
  y: number;
  label: string;
}

export interface PatientData {
  description: string;
  symptoms: string[];
  assessment: string;
  location: {
    lat: number;
    lng: number;
  } | null;
}
