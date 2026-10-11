/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL_API?: string;
  readonly VITE_MODO_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
