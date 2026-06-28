export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function now() {
  return Date.now()
}

export function jsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

export function jsonStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    return '{}'
  }
}

export function successResponse(data, message = 'success') {
  return new Response(JSON.stringify({
    success: true,
    message,
    data
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    status: 200
  })
}

export function errorResponse(message, status = 400, data = null) {
  return new Response(JSON.stringify({
    success: false,
    message,
    data
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    status
  })
}

export function generateAccountCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'CLOUD'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generatePassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'cloudpan-parser-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password)
  return inputHash === hash
}

export function getIpFromRequest(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown'
}

export function getUserAgent(request) {
  return request.headers.get('User-Agent') || 'unknown'
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function createJwt(payload, secret, expiresIn = 86400000) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  const now = Date.now()
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  }
  
  const base64Header = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_')
  const base64Payload = btoa(JSON.stringify(fullPayload)).replace(/\+/g, '-').replace(/\//g, '_')
  
  const signature = btoa(`${base64Header}.${base64Payload}.${secret}`)
    .replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${base64Header}.${base64Payload}.${signature}`
}

export function verifyJwt(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const base64Header = parts[0]
    const base64Payload = parts[1]
    const signature = parts[2]
    
    const expectedSignature = btoa(`${base64Header}.${base64Payload}.${secret}`)
      .replace(/\+/g, '-').replace(/\//g, '_')
    
    if (signature !== expectedSignature) return null
    
    const payload = parseJwt(token)
    if (payload.exp && payload.exp < Date.now()) return null
    
    return payload
  } catch {
    return null
  }
}
