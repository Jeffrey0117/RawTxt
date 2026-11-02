import config from './config.js'

// Hostname[:port] only — rejects anything that could inject into URLs/HTML.
const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i

// Build public base URL from the host the request actually came in on.
// Different domains (isnowfriend.com vs pipee.tw) may hit different storage,
// so links/QR codes must point back to the same domain. Falls back to BASE_URL.
export function resolveBaseUrl(request) {
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || '')
    .split(',')[0]
    .trim()
  if (!host || !HOST_RE.test(host)) return config.baseUrl

  const isLocal = /^(localhost|127\.|192\.168\.|10\.)/.test(host)
  // Behind a proxy that rewrites Host to loopback → don't leak localhost URLs.
  if (isLocal && process.env.NODE_ENV === 'production') return config.baseUrl
  const fwdProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const proto = fwdProto === 'http' || fwdProto === 'https' ? fwdProto : (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}
