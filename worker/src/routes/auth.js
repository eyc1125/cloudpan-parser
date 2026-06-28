import { 
  successResponse, 
  errorResponse, 
  generateId, 
  now, 
  hashPassword, 
  verifyPassword,
  createJwt,
  getIpFromRequest,
  getUserAgent,
  jsonStringify
} from '../utils/helpers'

const JWT_SECRET = 'cloudpan-parser-jwt-secret-key-2024-v002'

export async function handleUserLogin(request, env) {
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
    }, JWT_SECRET, 86400000 * 7)
    
    await env.DB.prepare(
      'UPDATE accounts SET last_used_at = ?, total_usage_count = total_usage_count + 1 WHERE id = ?'
    ).bind(now(), result.id).run()
    
    if (!result.user_id) {
      await env.DB.prepare(
        'UPDATE accounts SET user_id = ? WHERE id = ?'
      ).bind(userId, result.id).run()
      
      const userExists = await env.DB.prepare(
        'SELECT id FROM users WHERE id = ?'
      ).bind(userId).first()
      
      if (!userExists) {
        await env.DB.prepare(
          'INSERT INTO users (id, username, password_hash, role, account_code, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          userId,
          accountCode,
          await hashPassword(password),
          'user',
          accountCode,
          now(),
          'active'
        ).run()
      }
    }
    
    await env.DB.prepare(
      'UPDATE users SET last_login_at = ? WHERE id = ?'
    ).bind(now(), userId).run()
    
    await logOperation(env, {
      userId,
      accountCode,
      actionType: 'login',
      actionDetail: jsonStringify({ success: true }),
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request)
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

export async function handleAdminLogin(request, env) {
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
    
    if (!isValid) {
      const defaultHash = 'JDJhJDEwJEFaNldwWnBuQzhOcFJ6dWZOWHVkT2VrV0h5NTJNb3V4NXh6N2QyVHpGNUY2dGRaU0hZaW5L'
      if (result.password_hash === defaultHash && password === 'admin123456') {
        // 默认密码兼容
      } else {
        return errorResponse('密码错误', 401)
      }
    }
    
    const token = createJwt({
      userId: result.id,
      role: 'admin',
      username: username
    }, JWT_SECRET, 86400000 * 7)
    
    await env.DB.prepare(
      'UPDATE users SET last_login_at = ? WHERE id = ?'
    ).bind(now(), result.id).run()
    
    await logOperation(env, {
      userId: result.id,
      accountCode: username,
      actionType: 'admin_login',
      actionDetail: jsonStringify({ success: true }),
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request)
    })
    
    return successResponse({
      token,
      user: {
        id: result.id,
        username,
        role: 'admin'
      },
      role: 'admin'
    }, '登录成功')
    
  } catch (error) {
    console.error('管理员登录错误:', error)
    return errorResponse('登录失败: ' + error.message, 500)
  }
}

export async function handleGetMe(request, env, auth) {
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
      
      return successResponse({
        id: userId,
        role: 'user',
        accountCode,
        ...account
      })
    }
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return errorResponse('获取用户信息失败', 500)
  }
}

async function logOperation(env, data) {
  try {
    await env.DB.prepare(
      `INSERT INTO operation_logs 
       (id, user_id, account_code, action_type, action_detail, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId('log'),
      data.userId,
      data.accountCode,
      data.actionType,
      data.actionDetail,
      data.ip,
      data.userAgent,
      now()
    ).run()
  } catch (e) {
    console.error('记录日志失败:', e)
  }
}
