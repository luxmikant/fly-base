/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_NODE_ENV: string
  readonly VITE_DEFAULT_SITE_ID: string
  readonly VITE_MAP_DEFAULT_CENTER_LAT: string
  readonly VITE_MAP_DEFAULT_CENTER_LNG: string
  readonly VITE_MAP_DEFAULT_ZOOM: string
  readonly VITE_ENABLE_MOCK_DATA: string
  readonly VITE_ENABLE_DEBUG_LOGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}