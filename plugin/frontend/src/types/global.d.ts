declare global {
  interface Window {
    locagestConfig?: {
      apiBase: string
      token?: string
      roles?: string[]
      userEmail?: string
      username?: string
    }
  }
}

export {}
