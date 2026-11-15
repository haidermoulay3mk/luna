// Built with help from Claude (Anthropic).
// Which place is selected on the Moon map (shared by the 3D pins and the home panels).
import { create } from 'zustand';

export const useMapUi = create<{ selected: string | null; select: (id: string | null) => void }>()((set) => ({
  selected: null,
  select: (selected) => set({ selected }),
}));
