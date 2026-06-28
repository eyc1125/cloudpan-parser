import { getTokenFromRequest, verifyJwt, errorResponse, now } from '../utils/helpers'

const JWT_SECRET = 'cloudpan-parser-jwt-secret-key-2024-v002'

export async function authMiddleware(request, env, requiredRole = null) {
  const token = getTokenFromRequest(request)
  
  if (!token) {
    return { error: '未提供认证令牌', code: 401 }
  }
  
  const payload = verifyJwt(token, JWT_SECRET)
  
  if (!payload) {
    return { error: '认证令牌无效或已过期', code: 401 }
  }
  
  if (requiredRole && payload.role !== requiredRole && payload.role !== 'admin') {
    return { error: '权限不足', code: 403 }
  }
  
  return {
    userId: payload.userId,
    role: payload.role,
    accountCode: payload.accountCode,
    payload
  }
}

export function generateAuthToken(userId, role, accountCode = null) {
  const { createJwt } = require('../utils/helpers')
  return createJwt({
    userId,
    role,
    accountCode
  }, JWT_SECRET, 86400000 * 7)
}

export { JWT_SECRET }
