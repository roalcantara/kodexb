/** Search input debounce (ms); list RPC uses debounced value after typing stops. */
export const SEARCH_DEBOUNCE_MS = 1000

/** Default page size when config parse fails. */
export const DEFAULT_LIST_PAGE_SIZE = 50

/** Default list row height used until the browser can measure real rows. */
export const DEFAULT_LIST_ROW_HEIGHT_PX = 44

/** Extra rows rendered/fetched beyond the visible viewport. */
export const LIST_OVERSCAN_ROWS = 10

/** Initial viewport-derived page size before layout measurement completes. */
export const DEFAULT_VIEWPORT_LIST_PAGE_SIZE = 30

/** Guardrail for unusually tall host viewports. */
export const MAX_VIEWPORT_LIST_PAGE_SIZE = 200
