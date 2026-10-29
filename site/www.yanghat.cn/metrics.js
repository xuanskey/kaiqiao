// No IDs, cookies, storage, IP/UA, URL or referrer. Disabled unless a build explicitly sets /e.
export const EVENTS = Object.freeze(['visit','enter','grade_select','lesson_start','quiz_complete','backup_export_click']);
export function createTracker(endpoint = '', send = (...args) => globalThis.fetch(...args)) {
  return (event, grade = null) => {
    if (endpoint !== '/e' || !EVENTS.includes(event) || (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 6))) return;
    try {
      void Promise.resolve(send(endpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,
        headers:{'Content-Type':'application/json'},body:JSON.stringify({v:1,event,grade,count:1})})).catch(() => {});
    } catch { /* Measurement never blocks learning and never retries offline. */ }
  };
}
