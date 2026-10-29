import { createTracker } from '../../public/metrics.js';
// Production sets VITE_EVENT_ENDPOINT=/e in .env.production. An empty value sends nothing.
export const track = createTracker(import.meta.env.VITE_EVENT_ENDPOINT ?? '');
