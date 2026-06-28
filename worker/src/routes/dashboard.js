import { 
  successResponse, 
  errorResponse, 
  now 
} from '../utils/helpers'

export async function handleDashboardStats(request, env) {
  try {
    const totalAccounts = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM accounts'
    ).first()
    
    const activeAccounts = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM accounts WHERE status = ? AND expires_at > ?'
    ).bind('active', now()).first()
    
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTs = todayStart.getTime()
    
    const todayParses = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM parse_records WHERE created_at >= ?'
    ).bind(todayTs).first()
    
    const todayUploads = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM upload_files WHERE created_at >= ?'
    ).bind(todayTs).first()
    
    const totalParses = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM parse_records'
    ).first()
    
    const successParses = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM parse_records WHERE success = 1'
    ).first()
    
    const successRate = totalParses.count > 0 
      ? Math.round((successParses.count / totalParses.count) * 100) 
      : 100
    
    const totalUploadSize = await env.DB.prepare(
      'SELECT COALESCE(SUM(file_size), 0) as total FROM upload_files'
    ).first()
    
    const todayAiChats = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM ai_conversations WHERE updated_at >= ?'
    ).bind(todayTs).first()
    
    const onlineUsers = await env.DB.prepare(
      'SELECT COUNT(DISTINCT account_code) as count FROM operation_logs WHERE created_at >= ? AND action_type = ?'
    ).bind(now() - 30 * 60 * 1000, 'login').first()
    
    return successResponse({
      stats: {
        totalAccounts: totalAccounts.count,
        activeAccounts: activeAccounts.count,
        todayParses: todayParses.count,
        todayUploads: todayUploads.count,
        successRate,
        totalUploadSize: totalUploadSize.total,
        todayAiChats: todayAiChats.count,
        onlineUsers: onlineUsers.count
      }
    })
    
  } catch (error) {
    console.error('仪表盘统计错误:', error)
    return errorResponse('获取统计失败: ' + error.message, 500)
  }
}

export async function handleParseTrend(request, env) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    
    const result = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const startTs = date.getTime()
      date.setHours(23, 59, 59, 999)
      const endTs = date.getTime()
      
      const dayResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM parse_records WHERE created_at >= ? AND created_at <= ?'
      ).bind(startTs, endTs).first()
      
      const uploadResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM upload_files WHERE created_at >= ? AND created_at <= ?'
      ).bind(startTs, endTs).first()
      
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      
      result.push({
        date: dateStr,
        parses: dayResult.count,
        uploads: uploadResult.count
      })
    }
    
    return successResponse(result)
    
  } catch (error) {
    console.error('解析趋势错误:', error)
    return errorResponse('获取趋势数据失败: ' + error.message, 500)
  }
}

export async function handlePlatformDistribution(request, env) {
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
      const countResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM parse_records WHERE platform_type = ?'
      ).bind(platform.key).first()
      
      result.push({
        platform: platform.key,
        name: platform.name,
        count: countResult.count
      })
    }
    
    const otherResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM parse_records WHERE platform_type NOT IN (?, ?, ?, ?, ?, ?)'
    ).bind('tianyi', 'baidu', 'aliyun', 'douyin', 'kuaishou', 'bilibili').first()
    
    result.push({
      platform: 'other',
      name: '其他',
      count: otherResult.count
    })
    
    return successResponse(result)
    
  } catch (error) {
    console.error('平台分布错误:', error)
    return errorResponse('获取平台分布失败: ' + error.message, 500)
  }
}

export async function handleRecentLogs(request, env) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    const results = await env.DB.prepare(
      `SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all()
    
    return successResponse(results.results)
    
  } catch (error) {
    console.error('最近日志错误:', error)
    return errorResponse('获取日志失败: ' + error.message, 500)
  }
}
