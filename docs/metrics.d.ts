export type MetricEvent = 'visit' | 'enter' | 'grade_select' | 'lesson_start' | 'quiz_complete' | 'backup_export_click';
export const EVENTS: readonly MetricEvent[];
export function createTracker(endpoint?: string, send?: typeof fetch): (event: MetricEvent, grade?: number | null) => void;
