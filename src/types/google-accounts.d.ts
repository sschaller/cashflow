declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(overrideConfig?: { prompt?: string }): void
  }

  interface TokenResponse {
    access_token: string
    expires_in: number
    token_type: string
    scope: string
    error?: string
    error_description?: string
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string; message: string }) => void
    prompt?: string
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
  function revoke(token: string, callback?: () => void): void
}
