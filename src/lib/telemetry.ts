import { createTracker } from '../../public/metrics.js';
// No endpoint is configured by default. /e has no deployed handler in this change.
export const track = createTracker(import.meta.env.VITE_EVENT_ENDPOINT ?? '');
