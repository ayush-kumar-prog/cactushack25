import { create } from 'zustand';

export interface TranscriptItem {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
}

interface TranscriptState {
    items: TranscriptItem[];
    addItem: (sender: 'user' | 'ai', text: string) => void;
    clear: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
    items: [],
    addItem: (sender, text) => set((state) => ({
        items: [
            ...state.items,
            {
                id: Math.random().toString(36).substring(7),
                sender,
                text,
                timestamp: Date.now(),
            }
        ].slice(-5) // Keep only last 5 messages to avoid clutter
    })),
    clear: () => set({ items: [] }),
}));
