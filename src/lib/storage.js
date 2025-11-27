// Local storage key
const STORAGE_KEY = 'phomemo_saved_labels';

export const StorageService = {
  getSavedLabels: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  },

  saveLabel: (label) => {
    // label: { id, type, data, previewUrl, date }
    try {
      const current = StorageService.getSavedLabels();
      const newLabel = { ...label, id: Date.now(), date: new Date().toISOString() };
      const updated = [newLabel, ...current].slice(0, 50); // Keep last 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to save label", e);
      return [];
    }
  },

  deleteLabel: (id) => {
    try {
      const current = StorageService.getSavedLabels();
      const updated = current.filter(l => l.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
        return [];
    }
  }
};
