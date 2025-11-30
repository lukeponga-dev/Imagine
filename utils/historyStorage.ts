import { HistoryItem } from '../types';

const STORAGE_KEY = 'imageEnhancementHistory';

/**
 * Saves a new history item to localStorage. Adds the new item to the beginning of the list.
 * @param item The HistoryItem to save.
 */
export const saveHistoryItem = (item: HistoryItem) => {
  try {
    const history = getHistory();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...history]));
  } catch (e) {
    console.error('Failed to save history item to localStorage:', e);
    // Optionally, handle storage full errors or other issues
  }
};

/**
 * Retrieves all history items from localStorage.
 * @returns An array of HistoryItem objects.
 */
export const getHistory = (): HistoryItem[] => {
  try {
    const historyString = localStorage.getItem(STORAGE_KEY);
    return historyString ? (JSON.parse(historyString) as HistoryItem[]) : [];
  } catch (e) {
    console.error('Failed to load history from localStorage:', e);
    return [];
  }
};

/**
 * Clears all history items from localStorage.
 */
export const clearHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear history from localStorage:', e);
  }
};

/**
 * Removes a specific history item by its ID from localStorage.
 * @param id The ID of the history item to remove.
 */
export const removeHistoryItem = (id: string) => {
  try {
    const history = getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error('Failed to remove history item from localStorage:', e);
  }
};