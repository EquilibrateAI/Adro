import { create } from "zustand";

interface SelectedFilesState {
  selectedFiles: string[];
  setSelectedFiles: (files: string[]) => void;
  addSelectedFile: (file: string) => void;
  removeSelectedFile: (file: string) => void;
  clearSelectedFiles: () => void;
}

export const useSelectedFilesStore = create<SelectedFilesState>((set) => ({
  selectedFiles: [],
  setSelectedFiles: (files: string[]) => set({ selectedFiles: files }),
  addSelectedFile: (file: string) =>
    set((state) => ({
      selectedFiles: [...new Set([...state.selectedFiles, file])],
    })),
  removeSelectedFile: (file: string) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((f) => f !== file),
    })),
  clearSelectedFiles: () => set({ selectedFiles: [] }),
}));
