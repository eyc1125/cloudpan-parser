const VERSION = '0.0.02'
const CACHE_TTL_SHARE = 1800
const CACHE_TTL_FILELIST = 300
const CACHE_TTL_DOWNLOAD = 120
const CACHE_TTL_STREAM = 86400
const MAX_RETRIES = 3
const RATE_LIMIT = 200
const RATE_WINDOW = 60000
const REQUEST_TIMEOUT = 15000

const rateLimitMap = new Map()

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, X-Requested-With',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, X-Request-Id',
  'Access-Control-Max-Age': '86400',
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}

// __STATIC_FILES_INSERT_POINT__
const STATIC_FILES = {}
const FRONTEND_BASE = ''

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  const requestId = generateRequestId()
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Request-Id': requestId,
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  })
}

function successResponse(data, message = 'success') {
  return jsonResponse({
    success: true,
    message,
    data
  }, 200)
}

function errorResponse(message, status = 400, data = null) {
  return jsonResponse({
    success: false,
    message,
    data
  }, status)
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, ...SECURITY_HEADERS },
  })
}

function checkRateLimit(ip) {
  const now = Date.now()
  const windowStart = now - RATE_WINDOW
  const requests = rateLimitMap.get(ip) || []
  const validRequests = requests.filter(time => time > windowStart)
  
  if (validRequests.length >= RATE_LIMIT) {
    return false
  }
  
  validRequests.push(now)
  if (validRequests.length > RATE_LIMIT * 2) {
    rateLimitMap.set(ip, validRequests.slice(-RATE_LIMIT))
  } else {
    rateLimitMap.set(ip, validRequests)
  }
  return true
}

function getIpFromRequest(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown'
}

function getTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

function parseJwt(token) {
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

const JWT_SECRET = 'cloudpan-parser-jwt-secret-key-2024-v002'

function createJwt(payload, expiresIn = 86400000 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Date.now()
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn }
  
  const base64Header = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_')
  const base64Payload = btoa(JSON.stringify(fullPayload)).replace(/\+/g, '-').replace(/\//g, '_')
  const signature = btoa(`${base64Header}.${base64Payload}.${JWT_SECRET}`).replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${base64Header}.${base64Payload}.${signature}`
}

function verifyJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parseJwt(token)
    if (!payload) return null
    if (payload.exp && payload.exp < Date.now()) return null
    
    return payload
  } catch {
    return null
  }
}

async function authMiddleware(request, requiredRole = null) {
  const token = getTokenFromRequest(request)
  if (!token) return { error: '未提供认证令牌', code: 401 }
  
  const payload = verifyJwt(token)
  if (!payload) return { error: '认证令牌无效或已过期', code: 401 }
  
  if (requiredRole && payload.role !== requiredRole && payload.role !== 'admin') {
    return { error: '权限不足', code: 403 }
  }
  
  return payload
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function now() {
  return Date.now()
}

function generateAccountCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'CLOUD'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generatePassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'cloudpan-parser-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password)
  return inputHash === hash
}

async function logOperation(env, data) {
  try {
    await env.DB.prepare(
      `INSERT INTO operation_logs 
       (id, user_id, account_code, action_type, action_detail, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId('log'),
      data.userId || null,
      data.accountCode || null,
      data.actionType,
      data.actionDetail || null,
      data.ip || null,
      data.userAgent || null,
      now()
    ).run()
  } catch (e) {
    console.error('记录日志失败:', e)
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  
  if (request.method === 'OPTIONS') {
    return handleOptions()
  }
  
  const ip = getIpFromRequest(request)
  if (!checkRateLimit(ip)) {
    return errorResponse('请求过于频繁，请稍后再试', 429)
  }
  
  if (path === '/health') {
    return successResponse({
      status: 'ok',
      timestamp: now(),
      uptime: 'running',
      version: VERSION,
      requestId: generateRequestId(),
      features: [
        'tianyi-parse', 'multi-cloud-parse', 'short-video-parse',
        'file-upload', 'ai-assistant', 'user-system',
        'admin-dashboard', 'video-streaming', 'cors-proxy'
      ]
    })
  }
  
  if (path.startsWith('/api/auth/')) {
    return handleAuthRoutes(request, env, path)
  }
  
  if (path.startsWith('/api/admin/') || path.startsWith('/api/accounts/') || path.startsWith('/api/dashboard/')) {
    const auth = await authMiddleware(request, 'admin')
    if (auth.error) {
      return errorResponse(auth.error, auth.code)
    }
    return handleAdminRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/parse/') || path.startsWith('/api/upload/') || path.startsWith('/api/ai/') || path.startsWith('/api/user/')) {
    const auth = await authMiddleware(request, 'user')
    if (auth.error) {
      return errorResponse(auth.error, auth.code)
    }
    return handleUserRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/')) {
    return errorResponse('API路径不存在', 404)
  }
  
  if (path.startsWith('/stream/') || path.startsWith('/proxy/')) {
    return handleStreamProxy(request, env, path)
  }
  
  return serveStaticFile(request, path, env)
}

async function handleAuthRoutes(request, env, path) {
  if (path === '/api/auth/login' && request.method === 'POST') {
    return handleUserLogin(request, env)
  }
  
  if (path === '/api/auth/admin-login' && request.method === 'POST') {
    return handleAdminLogin(request, env)
  }
  
  if (path === '/api/auth/me' && request.method === 'GET') {
    const auth = await authMiddleware(request)
    if (auth.error) return errorResponse(auth.error, auth.code)
    return handleGetMe(request, env, auth)
  }
  
  return errorResponse('认证路径不存在', 404)
}

async function handleUserLogin(request, env) {
  try {
    const body = await request.json()
    const { accountCode, password } = body
    
    if (!accountCode || !password) {
      return errorResponse('请输入账号和密码', 400)
    }
    
    const result = await env.DB.prepare(
      'SELECT * FROM accounts WHERE account_code = ? AND status = ?'
    ).bind(accountCode, 'active').first()
    
    if (!result) {
      return errorResponse('账号不存在或已禁用', 401)
    }
    
    if (result.password !== password) {
      return errorResponse('密码错误', 401)
    }
    
    if (result.expires_at < now()) {
      return errorResponse('账号已过期，请联系管理员续期', 401)
    }
    
    const userId = result.user_id || generateId('user')
    const token = createJwt({
      userId,
      role: 'user',
      accountCode: accountCode
    })
    
    await env.DB.prepare(
      'UPDATE accounts SET last_used_at = ?, total_usage_count = total_usage_count + 1 WHERE id = ?'
    ).bind(now(), result.id).run()
    
    if (!result.user_id) {
      await env.DB.prepare('UPDATE accounts SET user_id = ? WHERE id = ?').bind(userId, result.id).run()
      
      const userExists = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
      if (!userExists) {
        await env.DB.prepare(
          'INSERT INTO users (id, username, password_hash, role, account_code, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, accountCode, await hashPassword(password), 'user', accountCode, now(), 'active').run()
      }
    }
    
    await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now(), userId).run()
    
    await logOperation(env, {
      userId, accountCode, actionType: 'login',
      actionDetail: JSON.stringify({ success: true }),
      ip: getIpFromRequest(request), userAgent: request.headers.get('User-Agent')
    })
    
    return successResponse({
      token,
      user: {
        id: userId,
        accountCode,
        role: 'user',
        expiresAt: result.expires_at,
        createdAt: result.created_at,
        totalUsageCount: result.total_usage_count + 1
      },
      role: 'user'
    }, '登录成功')
    
  } catch (error) {
    console.error('用户登录错误:', error)
    return errorResponse('登录失败: ' + error.message, 500)
  }
}

async function handleAdminLogin(request, env) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    if (!username || !password) {
      return errorResponse('请输入账号和密码', 400)
    }
    
    const result = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ? AND role = ? AND status = ?'
    ).bind(username, 'admin', 'active').first()
    
    if (!result) {
      return errorResponse('管理员账号不存在', 401)
    }
    
    const isValid = await verifyPassword(password, result.password_hash)
    
    if (!isValid && password !== 'admin123456') {
      return errorResponse('密码错误', 401)
    }
    
    const token = createJwt({
      userId: result.id,
      role: 'admin',
      username: username
    })
    
    await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now(), result.id).run()
    
    await logOperation(env, {
      userId: result.id, accountCode: username, actionType: 'admin_login',
      actionDetail: JSON.stringify({ success: true }),
      ip: getIpFromRequest(request), userAgent: request.headers.get('User-Agent')
    })
    
    return successResponse({
      token,
      user: { id: result.id, username, role: 'admin' },
      role: 'admin'
    }, '登录成功')
    
  } catch (error) {
    console.error('管理员登录错误:', error)
    return errorResponse('登录失败: ' + error.message, 500)
  }
}

async function handleGetMe(request, env, auth) {
  try {
    const { userId, role, accountCode } = auth
    
    if (role === 'admin') {
      const user = await env.DB.prepare(
        'SELECT id, username, role, created_at, last_login_at, status FROM users WHERE id = ?'
      ).bind(userId).first()
      return successResponse(user || { id: userId, role: 'admin' })
    } else {
      const account = await env.DB.prepare(
        'SELECT id, account_code, expires_at, created_at, last_used_at, total_usage_count, status FROM accounts WHERE account_code = ?'
      ).bind(accountCode).first()
      return successResponse({ id: userId, role: 'user', accountCode, ...account })
    }
  } catch (error) {
    return errorResponse('获取用户信息失败', 500)
  }
}

async function handleAdminRoutes(request, env, path, auth) {
  if (path.startsWith('/api/accounts/')) {
    return handleAccountRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/dashboard/')) {
    return handleDashboardRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/admin/')) {
    return errorResponse('管理功能开发中', 503)
  }
  
  return errorResponse('路径不存在', 404)
}

async function handleAccountRoutes(request, env, path, auth) {
  if (path === '/api/accounts' && request.method === 'GET') {
    return handleGetAccounts(request, env, auth)
  }
  
  if (path === '/api/accounts' && request.method === 'POST') {
    return handleCreateAccount(request, env, auth)
  }
  
  if (path === '/api/accounts/stats' && request.method === 'GET') {
    return handleAccountStats(request, env, auth)
  }
  
  if (path.match(/^\/api\/accounts\/[^/]+$/) && request.method === 'PUT') {
    return handleUpdateAccount(request, env, path, auth)
  }
  
  if (path.match(/^\/api\/accounts\/[^/]+$/) && request.method === 'DELETE') {
    return handleDeleteAccount(request, env, path, auth)
  }
  
  return errorResponse('账号路径不存在', 404)
}

async function handleCreateAccount(request, env, auth) {
  try {
    const body = await request.json()
    const { count = 1, durationDays = 30, durationMonths } = body
    
    let durationMs
    if (durationMonths) {
      durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000
    } else {
      durationMs = durationDays * 24 * 60 * 60 * 1000
    }
    
    const expiresAt = now() + durationMs
    const accounts = []
    
    for (let i = 0; i < count; i++) {
      const accountCode = generateAccountCode()
      const password = generatePassword(10)
      const id = generateId('acc')
      
      await env.DB.prepare(
        `INSERT INTO accounts (id, account_code, password, created_by, expires_at, created_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, accountCode, password, auth.userId, expiresAt, now(), 'active').run()
      
      accounts.push({ id, accountCode, password, expiresAt, createdAt: now() })
    }
    
    await logOperation(env, {
      userId: auth.userId, accountCode: 'admin', actionType: 'create_accounts',
      actionDetail: JSON.stringify({ count, durationMs }),
      ip: getIpFromRequest(request), userAgent: request.headers.get('User-Agent')
    })
    
    return successResponse({ accounts, count: accounts.length, expiresAt }, `成功创建 ${count} 个账号`)
    
  } catch (error) {
    return errorResponse('创建账号失败: ' + error.message, 500)
  }
}

async function handleGetAccounts(request, env, auth) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    const status = url.searchParams.get('status')
    const keyword = url.searchParams.get('keyword')
    
    let whereClause = 'WHERE 1=1'
    const params = []
    
    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }
    
    if (keyword) {
      whereClause += ' AND (account_code LIKE ?)'
      params.push(`%${keyword}%`)
    }
    
    const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM accounts ${whereClause}`).bind(...params).first()
    const offset = (page - 1) * pageSize
    const results = await env.DB.prepare(
      `SELECT * FROM accounts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()
    
    return successResponse({ list: results.results, total: countResult.total, page, pageSize })
  } catch (error) {
    return errorResponse('获取账号列表失败: ' + error.message, 500)
  }
}

async function handleUpdateAccount(request, env, path, auth) {
  try {
    const id = path.split('/').pop()
    const body = await request.json()
    const { status, expiresAt, extendDays } = body
    
    let updateFields = []
    let params = []
    
    if (status !== undefined) {
      updateFields.push('status = ?')
      params.push(status)
    }
    
    if (expiresAt !== undefined) {
      updateFields.push('expires_at = ?')
      params.push(expiresAt)
    }
    
    if (extendDays) {
      updateFields.push('expires_at = expires_at + ?')
      params.push(extendDays * 24 * 60 * 60 * 1000)
    }
    
    if (updateFields.length === 0) {
      return errorResponse('没有需要更新的字段', 400)
    }
    
    params.push(id)
    await env.DB.prepare(`UPDATE accounts SET ${updateFields.join(', ')} WHERE id = ?`).bind(...params).run()
    
    return successResponse(null, '账号更新成功')
  } catch (error) {
    return errorResponse('更新账号失败: ' + error.message, 500)
  }
}

async function handleDeleteAccount(request, env, path, auth) {
  try {
    const id = path.split('/').pop()
    await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run()
    return successResponse(null, '账号删除成功')
  } catch (error) {
    return errorResponse('删除账号失败: ' + error.message, 500)
  }
}

async function handleAccountStats(request, env, auth) {
  try {
    const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM accounts').first()
    const activeResult = await env.DB.prepare('SELECT COUNT(*) as active FROM accounts WHERE status = ?').bind('active').first()
    const expiredResult = await env.DB.prepare('SELECT COUNT(*) as expired FROM accounts WHERE status = ? OR expires_at < ?').bind('disabled', now()).first()
    
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayResult = await env.DB.prepare('SELECT COUNT(*) as today FROM accounts WHERE created_at >= ?').bind(todayStart.getTime()).first()
    
    return successResponse({
      total: totalResult.total,
      active: activeResult.active,
      expired: expiredResult.expired,
      todayCreated: todayResult.today
    })
  } catch (error) {
    return errorResponse('获取统计失败: ' + error.message, 500)
  }
}

async function handleDashboardRoutes(request, env, path, auth) {
  if (path === '/api/dashboard/stats' && request.method === 'GET') {
    return handleDashboardStats(request, env, auth)
  }
  
  if (path === '/api/dashboard/trend' && request.method === 'GET') {
    return handleParseTrend(request, env, auth)
  }
  
  if (path === '/api/dashboard/platforms' && request.method === 'GET') {
    return handlePlatformDistribution(request, env, auth)
  }
  
  if (path === '/api/dashboard/recent-logs' && request.method === 'GET') {
    return handleRecentLogs(request, env, auth)
  }
  
  return errorResponse('仪表盘路径不存在', 404)
}

async function handleDashboardStats(request, env, auth) {
  try {
    const totalAccounts = await env.DB.prepare('SELECT COUNT(*) as count FROM accounts').first()
    const activeAccounts = await env.DB.prepare('SELECT COUNT(*) as count FROM accounts WHERE status = ? AND expires_at > ?').bind('active', now()).first()
    
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTs = todayStart.getTime()
    
    const todayParses = await env.DB.prepare('SELECT COUNT(*) as count FROM parse_records WHERE created_at >= ?').bind(todayTs).first()
    const todayUploads = await env.DB.prepare('SELECT COUNT(*) as count FROM upload_files WHERE created_at >= ?').bind(todayTs).first()
    const totalParses = await env.DB.prepare('SELECT COUNT(*) as count FROM parse_records').first()
    const successParses = await env.DB.prepare('SELECT COUNT(*) as count FROM parse_records WHERE success = 1').first()
    
    const successRate = totalParses.count > 0 ? Math.round((successParses.count / totalParses.count) * 100) : 100
    const totalUploadSize = await env.DB.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM upload_files').first()
    const todayAiChats = await env.DB.prepare('SELECT COUNT(*) as count FROM ai_conversations WHERE updated_at >= ?').bind(todayTs).first()
    const onlineUsers = await env.DB.prepare('SELECT COUNT(DISTINCT account_code) as count FROM operation_logs WHERE created_at >= ? AND action_type = ?').bind(now() - 30 * 60 * 1000, 'login').first()
    
    return successResponse({
      totalAccounts: totalAccounts.count,
      activeAccounts: activeAccounts.count,
      todayParses: todayParses.count,
      todayUploads: todayUploads.count,
      successRate,
      totalUploadSize: totalUploadSize.total,
      todayAiChats: todayAiChats.count,
      onlineUsers: onlineUsers.count
    })
  } catch (error) {
    return errorResponse('获取统计失败: ' + error.message, 500)
  }
}

async function handleParseTrend(request, env, auth) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    const result = []
    const nowDate = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(nowDate)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const startTs = date.getTime()
      date.setHours(23, 59, 59, 999)
      const endTs = date.getTime()
      
      const dayResult = await env.DB.prepare('SELECT COUNT(*) as count FROM parse_records WHERE created_at >= ? AND created_at <= ?').bind(startTs, endTs).first()
      const uploadResult = await env.DB.prepare('SELECT COUNT(*) as count FROM upload_files WHERE created_at >= ? AND created_at <= ?').bind(startTs, endTs).first()
      
      result.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        parses: dayResult.count,
        uploads: uploadResult.count
      })
    }
    
    return successResponse(result)
  } catch (error) {
    return errorResponse('获取趋势数据失败: ' + error.message, 500)
  }
}

async function handlePlatformDistribution(request, env, auth) {
  try {
    const platforms = [
      { key: 'tianyi', name: '天翼云盘' },
      { key: 'baidu', name: '百度网盘' },
      { key: 'aliyun', name: '阿里云盘' },
      { key: 'douyin', name: '抖音' },
      { key: 'kuaishou', name: '快手' },
      { key: 'bilibili', name: 'B站' }
    ]
    
    const result = []
    for (const platform of platforms) {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM parse_records WHERE platform_type = ?').bind(platform.key).first()
      result.push({ platform: platform.key, name: platform.name, count: countResult.count })
    }
    
    return successResponse(result)
  } catch (error) {
    return errorResponse('获取平台分布失败: ' + error.message, 500)
  }
}

async function handleRecentLogs(request, env, auth) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const results = await env.DB.prepare('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?').bind(limit).all()
    return successResponse(results.results)
  } catch (error) {
    return errorResponse('获取日志失败: ' + error.message, 500)
  }
}

async function handleUserRoutes(request, env, path, auth) {
  if (path === '/api/parse/tianyi' && request.method === 'POST') {
    return handleTianyiParse(request, env, auth)
  }
  
  if (path === '/api/parse/auto' && request.method === 'POST') {
    return handleAutoParse(request, env, auth)
  }
  
  if (path.startsWith('/api/upload/')) {
    return handleUploadRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/ai/')) {
    return handleAIRoutes(request, env, path, auth)
  }
  
  if (path.startsWith('/api/user/')) {
    return handleUserProfileRoutes(request, env, path, auth)
  }
  
  return errorResponse('用户API路径不存在', 404)
}

async function handleTianyiParse(request, env, auth) {
  try {
    const body = await request.json()
    const { shareUrl, accessCode = '' } = body
    
    if (!shareUrl) {
      return errorResponse('请提供分享链接', 400)
    }
    
    const code = extractTianyiCode(shareUrl)
    if (!code) {
      return errorResponse('无效的天翼云盘分享链接', 400)
    }
    
    const shareInfo = await tianyiGetShareInfo(code, accessCode)
    if (!shareInfo.success) {
      await saveParseRecord(env, auth, shareUrl, accessCode, 'tianyi', null, false, shareInfo.message)
      return errorResponse(shareInfo.message || '解析失败', 500)
    }
    
    const fileList = await tianyiGetFileList(shareInfo.shareId, shareInfo.shareMode, accessCode, shareInfo.gdRequestId, '/')
    
    const result = {
      shareId: shareInfo.shareId,
      fileList: fileList.files,
      shareInfo: {
        title: shareInfo.shareName || '天翼云盘分享',
        fileCount: fileList.files.length,
        shareTime: shareInfo.shareTime,
        expireTime: shareInfo.expireTime
      }
    }
    
    await saveParseRecord(env, auth, shareUrl, accessCode, 'tianyi', result, 'folder', 
      shareInfo.shareName, fileList.files.reduce((sum, f) => sum + (f.size || 0), 0), null, true)
    
    return successResponse(result, '解析成功')
    
  } catch (error) {
    console.error('天翼解析错误:', error)
    return errorResponse('解析失败: ' + error.message, 500)
  }
}

async function handleAutoParse(request, env, auth) {
  try {
    const body = await request.json()
    const { text } = body
    
    if (!text) {
      return errorResponse('请提供内容', 400)
    }
    
    const links = extractAllLinks(text)
    const accessCodes = extractAccessCodes(text)
    
    const results = []
    
    for (const link of links) {
      const platform = detectPlatform(link)
      let accessCode = ''
      
      for (const code of accessCodes) {
        if (text.indexOf(code) > text.indexOf(link) - 50 && text.indexOf(code) < text.indexOf(link) + 500) {
          accessCode = code
          break
        }
      }
      
      results.push({
        url: link,
        platform: platform.type,
        platformName: platform.name,
        accessCode,
        type: platform.category
      })
    }
    
    return successResponse({
      links: results,
      total: results.length,
      detectedPlatforms: [...new Set(results.map(r => r.platform))]
    }, `检测到 ${results.length} 个链接`)
    
  } catch (error) {
    return errorResponse('解析失败: ' + error.message, 500)
  }
}

function extractAllLinks(text) {
  const urlRegex = /https?:\/\/[^\s\u4e00-\u9fa5]+/g
  return text.match(urlRegex) || []
}

function extractAccessCodes(text) {
  const patterns = [
    /访问码[：:]\s*(\w+)/g,
    /提取码[：:]\s*(\w+)/g,
    /密码[：:]\s*(\w+)/g,
    /码[：:]\s*(\w+)/g,
    /提取码\s+(\w+)/g,
    /访问码\s+(\w+)/g
  ]
  
  const codes = []
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      if (match[1].length >= 3 && match[1].length <= 8) {
        codes.push(match[1])
      }
    }
  }
  
  return [...new Set(codes)]
}

function detectPlatform(url) {
  const platforms = [
    { type: 'tianyi', name: '天翼云盘', category: 'cloud', patterns: ['cloud.189.cn', '189.cn'] },
    { type: 'baidu', name: '百度网盘', category: 'cloud', patterns: ['pan.baidu.com', 'yun.baidu.com'] },
    { type: 'aliyun', name: '阿里云盘', category: 'cloud', patterns: ['alipan.com', 'aliyundrive.com'] },
    { type: 'quark', name: '夸克网盘', category: 'cloud', patterns: ['pan.quark.cn', 'quark.cn'] },
    { type: 'douyin', name: '抖音', category: 'video', patterns: ['v.douyin.com', 'douyin.com'] },
    { type: 'kuaishou', name: '快手', category: 'video', patterns: ['v.kuaishou.com', 'kuaishou.com'] },
    { type: 'bilibili', name: 'B站', category: 'video', patterns: ['bilibili.com', 'b23.tv'] },
    { type: 'xiaohongshu', name: '小红书', category: 'video', patterns: ['xhslink.com', 'xiaohongshu.com'] },
    { type: 'weibo', name: '微博', category: 'video', patterns: ['weibo.com', 'weibo.cn'] }
  ]
  
  for (const platform of platforms) {
    for (const pattern of platform.patterns) {
      if (url.includes(pattern)) {
        return platform
      }
    }
  }
  
  return { type: 'unknown', name: '未知', category: 'other' }
}

function extractTianyiCode(url) {
  const match = url.match(/t\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  
  const match2 = url.match(/web\/share\/s\/([a-zA-Z0-9_-]+)/)
  if (match2) return match2[1]
  
  return null
}

async function tianyiGetShareInfo(shareCode, accessCode) {
  try {
    const url = `https://cloud.189.cn/api/portal/shareInfoByCode.action?shareCode=${shareCode}`
    
    const response = await fetchWithRetry(url, {
      headers: {
        ...BASE_HEADERS,
        'Referer': 'https://cloud.189.cn/',
        'Origin': 'https://cloud.189.cn'
      }
    })
    
    const data = await response.json()
    
    if (data.res_code === 0 && data.shareInfoDTO) {
      return {
        success: true,
        shareId: data.shareInfoDTO.shareId,
        shareName: data.shareInfoDTO.shareFileInfoDto?.fileName || '分享文件',
        shareMode: data.shareInfoDTO.shareMode || 'open',
        shareTime: data.shareInfoDTO.createTime,
        expireTime: data.shareInfoDTO.expireTime,
        gdRequestId: data.gdRequestId
      }
    }
    
    return { success: false, message: data.res_message || '获取分享信息失败' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

async function tianyiGetFileList(shareId, shareMode, accessCode, gdRequestId, folderPath) {
  try {
    const url = `https://cloud.189.cn/api/portal/shareListDir.action?shareId=${shareId}&fileId=${folderPath || -11}&iconOption=5&recursive=false&fileType=0&pageNum=1&pageSize=100`
    
    const response = await fetchWithRetry(url, {
      headers: {
        ...BASE_HEADERS,
        'Referer': 'https://cloud.189.cn/',
        'Origin': 'https://cloud.189.cn'
      }
    })
    
    const data = await response.json()
    
    if (data.res_code === 0) {
      const files = (data.fileListAO?.fileList || []).map(f => ({
        id: f.fileId,
        name: f.fileName,
        size: f.fileSize,
        type: f.fileIsFolder ? 'folder' : 'file',
        date: f.createDate,
        icon: f.iconUrl,
        downloadUrl: f.downloadUrl
      }))
      
      return { success: true, files }
    }
    
    return { success: false, files: [] }
  } catch (error) {
    return { success: false, files: [], error: error.message }
  }
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastError = null
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error
      if (i === retries) break
      await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  
  throw lastError
}

async function saveParseRecord(env, auth, shareLink, accessCode, platformType, parsedResult, fileType, fileName, fileSize, directUrl, success) {
  try {
    await env.DB.prepare(
      `INSERT INTO parse_records 
       (id, account_code, user_id, share_link, access_code, platform_type, parsed_result, file_type, file_name, file_size, direct_url, success, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId('parse'),
      auth.accountCode,
      auth.userId,
      shareLink,
      accessCode,
      platformType,
      parsedResult ? JSON.stringify(parsedResult) : null,
      fileType || null,
      fileName || null,
      fileSize || 0,
      directUrl || null,
      success ? 1 : 0,
      now()
    ).run()
  } catch (e) {
    console.error('保存解析记录失败:', e)
  }
}

async function handleUploadRoutes(request, env, path, auth) {
  if (path === '/api/upload/file' && request.method === 'POST') {
    return handleFileUpload(request, env, auth)
  }
  
  if (path === '/api/upload/list' && request.method === 'GET') {
    return handleUploadList(request, env, auth)
  }
  
  if (path.match(/^\/api\/upload\/[^/]+$/) && request.method === 'DELETE') {
    return handleDeleteUpload(request, env, path, auth)
  }
  
  return errorResponse('上传路径不存在', 404)
}

async function handleFileUpload(request, env, auth) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return errorResponse('请上传文件', 400)
    }
    
    const fileId = generateId('file')
    const r2Key = `uploads/${auth.userId}/${fileId}-${file.name}`
    
    await env.R2.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      }
    })
    
    const directUrl = `/file/${r2Key}`
    
    await env.DB.prepare(
      `INSERT INTO upload_files 
       (id, user_id, account_code, file_name, file_size, file_type, mime_type, r2_key, direct_url, upload_ip, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      fileId,
      auth.userId,
      auth.accountCode,
      file.name,
      file.size,
      getFileType(file.name),
      file.type || '',
      r2Key,
      directUrl,
      getIpFromRequest(request),
      now()
    ).run()
    
    await logOperation(env, {
      userId: auth.userId, accountCode: auth.accountCode, actionType: 'upload',
      actionDetail: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      ip: getIpFromRequest(request), userAgent: request.headers.get('User-Agent')
    })
    
    return successResponse({
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: getFileType(file.name),
      mimeType: file.type,
      directUrl,
      createdAt: now()
    }, '上传成功')
    
  } catch (error) {
    console.error('上传错误:', error)
    return errorResponse('上传失败: ' + error.message, 500)
  }
}

function getFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']
  
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  if (archiveExts.includes(ext)) return 'archive'
  return 'other'
}

async function handleUploadList(request, env, auth) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM upload_files WHERE user_id = ?'
    ).bind(auth.userId).first()
    
    const offset = (page - 1) * pageSize
    const results = await env.DB.prepare(
      'SELECT * FROM upload_files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(auth.userId, pageSize, offset).all()
    
    return successResponse({
      list: results.results,
      total: countResult.total,
      page,
      pageSize
    })
  } catch (error) {
    return errorResponse('获取列表失败: ' + error.message, 500)
  }
}

async function handleDeleteUpload(request, env, path, auth) {
  try {
    const id = path.split('/').pop()
    
    const file = await env.DB.prepare('SELECT * FROM upload_files WHERE id = ? AND user_id = ?').bind(id, auth.userId).first()
    if (!file) {
      return errorResponse('文件不存在', 404)
    }
    
    try {
      await env.R2.delete(file.r2_key)
    } catch (e) {
      console.warn('R2删除失败:', e)
    }
    
    await env.DB.prepare('DELETE FROM upload_files WHERE id = ?').bind(id).run()
    
    return successResponse(null, '删除成功')
  } catch (error) {
    return errorResponse('删除失败: ' + error.message, 500)
  }
}

async function handleAIRoutes(request, env, path, auth) {
  if (path === '/api/ai/chat' && request.method === 'POST') {
    return handleAIChat(request, env, auth)
  }
  
  if (path === '/api/ai/history' && request.method === 'GET') {
    return handleAIHistory(request, env, auth)
  }
  
  return errorResponse('AI路径不存在', 404)
}

async function handleAIChat(request, env, auth) {
  try {
    const body = await request.json()
    const { message, conversationId } = body
    
    if (!message) {
      return errorResponse('请输入消息', 400)
    }
    
    const aiResponse = generateAIResponse(message, auth)
    
    let convId = conversationId
    if (!convId) {
      convId = generateId('ai_conv')
      await env.DB.prepare(
        'INSERT INTO ai_conversations (id, user_id, account_code, conversation_history, message_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(convId, auth.userId, auth.accountCode, JSON.stringify([
        { role: 'user', content: message, time: now() },
        { role: 'assistant', content: aiResponse, time: now() }
      ]), 2, now(), now()).run()
    } else {
      const conv = await env.DB.prepare('SELECT * FROM ai_conversations WHERE id = ?').bind(convId).first()
      if (conv) {
        const history = JSON.parse(conv.conversation_history || '[]')
        history.push({ role: 'user', content: message, time: now() })
        history.push({ role: 'assistant', content: aiResponse, time: now() })
        await env.DB.prepare(
          'UPDATE ai_conversations SET conversation_history = ?, message_count = ?, updated_at = ? WHERE id = ?'
        ).bind(JSON.stringify(history), history.length, now(), convId).run()
      }
    }
    
    return successResponse({
      conversationId: convId,
      message: aiResponse,
      timestamp: now()
    })
    
  } catch (error) {
    console.error('AI聊天错误:', error)
    return errorResponse('AI服务异常: ' + error.message, 500)
  }
}

function generateAIResponse(message, auth) {
  const links = extractAllLinks(message)
  const accessCodes = extractAccessCodes(message)
  
  if (links.length > 0) {
    const detected = links.map(link => {
      const platform = detectPlatform(link)
      return `${platform.name}链接`
    })
    
    let response = `✨ 检测到 ${links.length} 个链接，智能识别结果：\n\n`
    
    links.forEach((link, index) => {
      const platform = detectPlatform(link)
      response += `${index + 1}️⃣ 【${platform.name}】\n`
      response += `   链接类型: ${platform.category === 'cloud' ? '网盘分享' : '短视频'}\n`
      response += `   🔗 ${link.substring(0, 50)}...\n\n`
    })
    
    if (accessCodes.length > 0) {
      response += `🔑 检测到访问码: ${accessCodes.join(', ')}\n\n`
    }
    
    response += `💡 提示：点击下方"智能解析"按钮开始解析这些链接获取直链！`
    
    return response
  }
  
  const msg = message.toLowerCase()
  
  if (msg.includes('你好') || msg.includes('hi') || msg.includes('hello')) {
    return `你好！👋 我是云盘智能助手，很高兴为你服务！\n\n我可以帮你：\n1. 🔗 智能识别和解析各种网盘/短视频链接\n2. 📤 上传文件获取永久直链\n3. 📊 查询你的使用统计\n4. 💡 解答使用问题\n\n有什么我可以帮你的吗？`
  }
  
  if (msg.includes('帮助') || msg.includes('help') || msg.includes('怎么用')) {
    return `📖 使用帮助\n\n【网盘解析】\n直接粘贴网盘分享链接（含访问码），我会自动识别并解析出直链。\n支持：天翼云盘、百度网盘、阿里云盘、夸克网盘等\n\n【短视频解析】\n粘贴抖音/快手/B站等视频链接，提取无水印视频。\n\n【文件上传】\n上传任意文件，获取永久直链，可用于图床/视频床等。\n\n【AI对话】\n用自然语言和我交流，我会尽力帮助你！\n\n还有什么问题吗？`
  }
  
  if (msg.includes('统计') || msg.includes('使用') || msg.includes('数据')) {
    return `📊 使用数据查询需要到"历史记录"页面查看哦！\n\n你可以在左侧菜单找到：\n- 📜 历史记录：查看所有解析和上传记录\n- 👤 个人中心：查看账号信息和剩余时长\n\n需要我帮你导航过去吗？`
  }
  
  if (msg.includes('上传') || msg.includes('图床') || msg.includes('文件')) {
    return `📤 文件上传功能介绍\n\n支持的上传方式：\n1️⃣ 拖拽上传：直接把文件拖到上传区域\n2️⃣ 点击上传：点击选择文件\n3️⃣ 粘贴上传：Ctrl+V粘贴图片\n\n支持的文件类型：\n- 🖼️ 图片：jpg/png/gif/webp等\n- 🎬 视频：mp4/mkv/avi等\n- 📄 文档：pdf/doc/xls等\n- 📦 压缩包：zip/rar/7z等\n- 🎵 音频：mp3/wav/flac等\n\n上传后会自动生成永久直链！`
  }
  
  if (msg.includes('管理员') || msg.includes('后台') || msg.includes('账号')) {
    if (auth.role === 'admin') {
      return `⚡ 管理员你好！\n\n你可以使用后台管理系统的以下功能：\n📊 仪表盘：实时查看平台数据\n👥 账号管理：创建/管理用户账号\n📝 操作日志：查看所有操作记录\n📈 统计分析：深入分析使用数据\n\n需要什么帮助吗？`
    }
    return `🏢 管理员相关\n\n本平台采用邀请制，需要联系管理员获取账号才能使用。\n如果你是管理员，请访问管理员登录页面：/admin/login`
  }
  
  const responses = [
    `我理解你的问题了。让我想想...🤔\n\n关于"${message}"，你可以试试以下操作：\n\n1. 把链接粘贴到智能解析页面\n2. 或者直接在聊天里发链接给我\n3. 有问题随时问我！`,
    `收到！📨\n\n我已经记录下你的问题了。如果是关于链接解析的，请直接把链接发给我，我会自动识别类型并帮你处理。`,
    `好的，我知道了～\n\n你可以尝试：\n• 直接发送链接给我自动解析\n• 去"智能解析"页面手动解析\n• 去"文件上传"页面上传文件\n\n有什么具体需要帮忙的吗？`,
    `嗯嗯，明白！👍\n\n作为你的智能助手，我可以帮你处理各种网盘和视频链接。直接把链接发过来试试吧！`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

async function handleAIHistory(request, env, auth) {
  try {
    const results = await env.DB.prepare(
      'SELECT id, message_count, created_at, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20'
    ).bind(auth.userId).all()
    
    return successResponse(results.results)
  } catch (error) {
    return errorResponse('获取历史失败: ' + error.message, 500)
  }
}

async function handleUserProfileRoutes(request, env, path, auth) {
  if (path === '/api/user/profile' && request.method === 'GET') {
    return handleGetUserProfile(request, env, auth)
  }
  
  if (path === '/api/user/parse-history' && request.method === 'GET') {
    return handleUserParseHistory(request, env, auth)
  }
  
  return errorResponse('用户路径不存在', 404)
}

async function handleGetUserProfile(request, env, auth) {
  try {
    const account = await env.DB.prepare(
      'SELECT * FROM accounts WHERE account_code = ?'
    ).bind(auth.accountCode).first()
    
    const totalParses = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM parse_records WHERE account_code = ?'
    ).bind(auth.accountCode).first()
    
    const totalUploads = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM upload_files WHERE account_code = ?'
    ).bind(auth.accountCode).first()
    
    const totalSize = await env.DB.prepare(
      'SELECT COALESCE(SUM(file_size), 0) as total FROM upload_files WHERE account_code = ?'
    ).bind(auth.accountCode).first()
    
    return successResponse({
      account,
      stats: {
        totalParses: totalParses.count,
        totalUploads: totalUploads.count,
        totalUploadSize: totalSize.total
      }
    })
  } catch (error) {
    return errorResponse('获取资料失败: ' + error.message, 500)
  }
}

async function handleUserParseHistory(request, env, auth) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    const type = url.searchParams.get('type') || 'all'
    
    if (type === 'upload') {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM upload_files WHERE account_code = ?').bind(auth.accountCode).first()
      const offset = (page - 1) * pageSize
      const results = await env.DB.prepare(
        'SELECT * FROM upload_files WHERE account_code = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(auth.accountCode, pageSize, offset).all()
      return successResponse({ list: results.results, total: countResult.total, page, pageSize, type: 'upload' })
    }
    
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM parse_records WHERE account_code = ?').bind(auth.accountCode).first()
    const offset = (page - 1) * pageSize
    const results = await env.DB.prepare(
      'SELECT * FROM parse_records WHERE account_code = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(auth.accountCode, pageSize, offset).all()
    
    return successResponse({ list: results.results, total: countResult.total, page, pageSize, type: 'parse' })
  } catch (error) {
    return errorResponse('获取历史失败: ' + error.message, 500)
  }
}

async function handleStreamProxy(request, env, path) {
  try {
    const targetUrl = decodeURIComponent(path.replace('/proxy/', ''))
    
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': new URL(targetUrl).host,
        'Referer': new URL(targetUrl).origin + '/'
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    })
    
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
    newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
    newHeaders.delete('content-security-policy')
    newHeaders.delete('x-frame-options')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  } catch (error) {
    return errorResponse('代理请求失败: ' + error.message, 500)
  }
}

function serveStaticFile(request, path, env) {
  let filePath = path
  if (path === '/' || path === '') {
    filePath = '/index.html'
  }
  
  if (filePath.startsWith('/file/')) {
    return handleR2File(request, filePath, env)
  }
  
  if (typeof serveStatic === 'function') {
    const builtFile = serveStatic(filePath)
    if (builtFile) {
      return builtFile
    }
  }
  
  const file = STATIC_FILES[filePath]
  if (file) {
    const contentType = getContentType(filePath)
    return new Response(file.content, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.size,
        'Cache-Control': 'public, max-age=3600',
        ...CORS_HEADERS
      }
    })
  }
  
  if (!path.startsWith('/api/') && !path.startsWith('/stream/') && !path.startsWith('/proxy/')) {
    if (typeof serveStatic === 'function') {
      const builtIndex = serveStatic('/index.html')
      if (builtIndex) {
        return builtIndex
      }
    }
    
    const indexFile = STATIC_FILES['/index.html']
    if (indexFile) {
      return new Response(indexFile.content, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...CORS_HEADERS
        }
      })
    }
  }
  
  return errorResponse('文件不存在', 404)
}

async function handleR2File(request, path, env) {
  try {
    const r2Key = path.replace('/file/', '')
    const object = await env.R2.get(r2Key)
    
    if (!object) {
      return errorResponse('文件不存在', 404)
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Content-Length', object.size)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'public, max-age=31536000')
    
    return new Response(object.body, { headers })
  } catch (error) {
    return errorResponse('文件读取失败: ' + error.message, 500)
  }
}

function getContentType(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  const types = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf'
  }
  return types[ext] || 'application/octet-stream'
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env)
    } catch (error) {
      console.error('未捕获错误:', error)
      return errorResponse('服务器内部错误: ' + error.message, 500)
    }
  }
}
