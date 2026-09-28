/** Small shared UI state that survives route changes (in memory only). */
export const uiState = {
  // Home page filters
  query: '',
  filter: 'all',
  sort: 'name',
  // Navigation helpers
  homeScroll: 0,
  lastDogId: null,
  focusSearchOnHome: false,
};
