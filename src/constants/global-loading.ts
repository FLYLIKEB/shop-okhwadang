export const GLOBAL_LOADING_START_EVENT = 'okhwadang:global-loading:start';
export const GLOBAL_LOADING_END_EVENT = 'okhwadang:global-loading:end';

export function emitGlobalLoadingEvent(eventName: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(eventName));
}
