/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_API_URL: string
  readonly VITE_WHATSAPP_ACCESS_TOKEN: string
  readonly VITE_SMS_API_URL: string
  readonly VITE_SMS_API_KEY: string
  readonly VITE_SMS_FROM_NUMBER: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
