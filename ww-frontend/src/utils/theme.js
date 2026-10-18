export const getSavedTheme = () => {
  try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
};

export const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try { localStorage.setItem('theme', theme); } catch {}
};