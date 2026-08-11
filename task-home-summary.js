(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TaskHomeSummary = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const LIFE_CATEGORIES = new Set(['admin', 'life-admin', 'household', 'finance']);

  function dateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildTaskHomeSummary(tasks, now = new Date()) {
    if (!tasks || typeof tasks !== 'object' || Array.isArray(tasks)) {
      return { urgency: 'unavailable', nextAction: 'Task source unavailable', blocked: false };
    }
    const today = dateKey(now);
    const activeLifeTasks = Object.values(tasks).filter(task => task && typeof task === 'object'
      && task.completed !== true && LIFE_CATEGORIES.has(task.category));
    const dates = activeLifeTasks.map(task => dateKey(task.dueDate)).filter(Boolean);
    if (dates.some(date => date < today)) return { urgency: 'overdue', nextAction: 'Review overdue life-admin task', blocked: false };
    if (dates.some(date => date === today)) return { urgency: 'due', nextAction: 'Review due life-admin task', blocked: false };
    if (dates.some(date => date <= dateKey(new Date(new Date(now).getTime() + 7 * 86400000)))) return { urgency: 'upcoming', nextAction: 'Review upcoming life-admin task', blocked: false };
    return { urgency: 'none', nextAction: 'No life-admin task is due', blocked: false };
  }

  return { buildTaskHomeSummary };
});
