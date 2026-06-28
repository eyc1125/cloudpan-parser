import { 
  successResponse, 
  errorResponse, 
  generateId, 
  now, 
  generateAccountCode, 
  generatePassword,
  jsonStringify,
  getIpFromRequest,
  getUserAgent
} from '../utils/helpers'

export async function handleCreateAccount(request, env, auth) {
  try {
    const body = await request.json()
    const { count = 1, durationHours = 24 * 30, durationDays, durationMonths } = body
    
    let durationMs
    if (durationMonths) {
      durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000
    } else if (durationDays) {
      durationMs = durationDays * 24 * 60 * 60 * 1000
    } else {
      durationMs = durationHours * 60 * 60 * 1000
    }
    
    const expiresAt = now() + durationMs
    const createdBy = auth.userId
    
    const accounts = []
    
    for (let i = 0; i < count; i++) {
      const accountCode = generateAccountCode()
      const password = generatePassword(10)
      const id = generateId('acc')
      
      await env.DB.prepare(
        `INSERT INTO accounts 
         (id, account_code, password, created_by, expires_at, created_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        accountCode,
        password,
        createdBy,
        expiresAt,
        now(),
        'active'
      ).run()
      
      accounts.push({
        id,
        accountCode,
        password,
        expiresAt,
        createdAt: now()
      })
    }
    
    await logOperation(env, {
      userId: auth.userId,
      accountCode: 'admin',
      actionType: 'create_accounts',
      actionDetail: jsonStringify({ count, durationMs }),
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request)
    })
    
    return successResponse({
      accounts,
      count: accounts.length,
      expiresAt
    }, `成功创建 ${count} 个账号`)
    
  } catch (error) {
    console.error('创建账号错误:', error)
    return errorResponse('创建账号失败: ' + error.message, 500)
  }
}

export async function handleGetAccounts(request, env, auth) {
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
      whereClause += ' AND (account_code LIKE ? OR user_id LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM accounts ${whereClause}`
    ).bind(...params).first()
    
    const offset = (page - 1) * pageSize
    const results = await env.DB.prepare(
      `SELECT * FROM accounts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()
    
    return successResponse({
      list: results.results,
      total: countResult.total,
      page,
      pageSize
    })
    
  } catch (error) {
    console.error('获取账号列表错误:', error)
    return errorResponse('获取账号列表失败: ' + error.message, 500)
  }
}

export async function handleUpdateAccount(request, env, auth) {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()
    const body = await request.json()
    
    const { status, expiresAt } = body
    
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
    
    if (updateFields.length === 0) {
      return errorResponse('没有需要更新的字段', 400)
    }
    
    params.push(id)
    
    await env.DB.prepare(
      `UPDATE accounts SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...params).run()
    
    await logOperation(env, {
      userId: auth.userId,
      accountCode: 'admin',
      actionType: 'update_account',
      actionDetail: jsonStringify({ id, ...body }),
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request)
    })
    
    return successResponse(null, '账号更新成功')
    
  } catch (error) {
    console.error('更新账号错误:', error)
    return errorResponse('更新账号失败: ' + error.message, 500)
  }
}

export async function handleDeleteAccount(request, env, auth) {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()
    
    await env.DB.prepare(
      'DELETE FROM accounts WHERE id = ?'
    ).bind(id).run()
    
    await logOperation(env, {
      userId: auth.userId,
      accountCode: 'admin',
      actionType: 'delete_account',
      actionDetail: jsonStringify({ id }),
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request)
    })
    
    return successResponse(null, '账号删除成功')
    
  } catch (error) {
    console.error('删除账号错误:', error)
    return errorResponse('删除账号失败: ' + error.message, 500)
  }
}

export async function handleGetAccountStats(request, env, auth) {
  try {
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM accounts'
    ).first()
    
    const activeResult = await env.DB.prepare(
      'SELECT COUNT(*) as active FROM accounts WHERE status = ?'
    ).bind('active').first()
    
    const expiredResult = await env.DB.prepare(
      'SELECT COUNT(*) as expired FROM accounts WHERE status = ? OR expires_at < ?'
    ).bind('disabled', now()).first()
    
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayResult = await env.DB.prepare(
      'SELECT COUNT(*) as today FROM accounts WHERE created_at >= ?'
    ).bind(todayStart.getTime()).first()
    
    return successResponse({
      total: totalResult.total,
      active: activeResult.active,
      expired: expiredResult.expired,
      todayCreated: todayResult.today
    })
    
  } catch (error) {
    console.error('获取账号统计错误:', error)
    return errorResponse('获取统计失败: ' + error.message, 500)
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
