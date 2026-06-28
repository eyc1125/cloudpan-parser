const CACHE_TTL = 3600

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

async function parseShareUrl(url) {
  let shareId = ''
  let accessCode = ''

  if (url.includes('cloud.189.cn/t/')) {
    const match = url.match(/cloud\.189\.cn\/t\/([a-zA-Z0-9]+)/)
    if (match) shareId = match[1]
  }

  return { shareId, accessCode, platform: 'tianyi' }
}

async function tianyiGetShareInfo(shareId, accessCode = '') {
  const url = `https://cloud.189.cn/api/open/share/getShareInfoByCodeV2.action?shareId=${encodeURIComponent(shareId)}&accessCode=${encodeURIComponent(accessCode)}`
  
  const response = await fetch(url, {
    headers: {
      ...BASE_HEADERS,
      'Referer': 'https://cloud.189.cn/',
      'Origin': 'https://cloud.189.cn',
    },
  })
  
  const data = await response.json()
  return data
}

async function tianyiGetFileList(shareId, fileId = '-11', accessCode = '', pageNum = 1, pageSize = 60) {
  const url = `https://cloud.189.cn/api/open/share/listShareDir.action?shareId=${encodeURIComponent(shareId)}&fileId=${encodeURIComponent(fileId)}&accessCode=${encodeURIComponent(accessCode)}&pageNum=${pageNum}&pageSize=${pageSize}`
  
  const response = await fetch(url, {
    headers: {
      ...BASE_HEADERS,
      'Referer': 'https://cloud.189.cn/',
      'Origin': 'https://cloud.189.cn',
    },
  })
  
  const data = await response.json()
  return data
}

async function tianyiGetDownloadUrl(shareId, fileId, accessCode = '') {
  const url = `https://cloud.189.cn/api/open/share/getShareDownloadUrl.action?shareId=${encodeURIComponent(shareId)}&fileId=${encodeURIComponent(fileId)}&accessCode=${encodeURIComponent(accessCode)}`
  
  const response = await fetch(url, {
    headers: {
      ...BASE_HEADERS,
      'Referer': 'https://cloud.189.cn/',
      'Origin': 'https://cloud.189.cn',
    },
  })
  
  const data = await response.json()
  return data
}

async function streamProxy(request, fileUrl) {
  const range = request.headers.get('Range') || ''
  
  const headers = {
    'User-Agent': BASE_HEADERS['User-Agent'],
    'Referer': 'https://cloud.189.cn/',
  }
  
  if (range) {
    headers['Range'] = range
  }
  
  const response = await fetch(fileUrl, { headers })
  
  const newHeaders = new Headers(response.headers)
  newHeaders.set('Access-Control-Allow-Origin', '*')
  newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range')
  
  if (!newHeaders.has('Content-Type')) {
    newHeaders.set('Content-Type', 'application/octet-stream')
  }
  
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  })
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return handleOptions()
  }

  if (path === '/' || path === '') {
    return new Response('云盘直链解析API - 支持天翼网盘', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (path === '/api/parse' && request.method === 'POST') {
    try {
      const body = await request.json()
      const shareUrl = body.url || ''
      const accessCode = body.accessCode || ''

      if (!shareUrl) {
        return jsonResponse({ error: '请提供分享链接' }, 400)
      }

      const { shareId, platform } = await parseShareUrl(shareUrl)
      const code = accessCode || (shareUrl.match(/访问码[：:]\s*(\w+)/)?.[1] || '')

      if (!shareId) {
        return jsonResponse({ error: '无法识别分享链接' }, 400)
      }

      if (platform === 'tianyi') {
        const shareInfo = await tianyiGetShareInfo(shareId, code)
        
        if (shareInfo.res_code !== 0) {
          return jsonResponse({ 
            error: shareInfo.res_message || '获取分享信息失败',
            res_code: shareInfo.res_code 
          }, 400)
        }

        const fileList = await tianyiGetFileList(shareId, '-11', code)
        
        return jsonResponse({
          success: true,
          platform: 'tianyi',
          shareId,
          accessCode: code,
          shareInfo: shareInfo.shareInfo || {},
          fileList: fileList.fileListAO || {},
        })
      }

      return jsonResponse({ error: '不支持的网盘平台' }, 400)
    } catch (error) {
      return jsonResponse({ error: '解析失败: ' + error.message }, 500)
    }
  }

  if (path === '/api/filelist' && request.method === 'GET') {
    try {
      const platform = url.searchParams.get('platform') || 'tianyi'
      const shareId = url.searchParams.get('shareId') || ''
      const fileId = url.searchParams.get('fileId') || '-11'
      const accessCode = url.searchParams.get('accessCode') || ''
      const pageNum = parseInt(url.searchParams.get('pageNum') || '1')
      const pageSize = parseInt(url.searchParams.get('pageSize') || '60')

      if (!shareId) {
        return jsonResponse({ error: '缺少shareId参数' }, 400)
      }

      if (platform === 'tianyi') {
        const data = await tianyiGetFileList(shareId, fileId, accessCode, pageNum, pageSize)
        return jsonResponse({ success: true, data })
      }

      return jsonResponse({ error: '不支持的网盘平台' }, 400)
    } catch (error) {
      return jsonResponse({ error: '获取文件列表失败: ' + error.message }, 500)
    }
  }

  if (path === '/api/download' && request.method === 'GET') {
    try {
      const platform = url.searchParams.get('platform') || 'tianyi'
      const shareId = url.searchParams.get('shareId') || ''
      const fileId = url.searchParams.get('fileId') || ''
      const accessCode = url.searchParams.get('accessCode') || ''

      if (!shareId || !fileId) {
        return jsonResponse({ error: '缺少必要参数' }, 400)
      }

      if (platform === 'tianyi') {
        const data = await tianyiGetDownloadUrl(shareId, fileId, accessCode)
        
        if (data.res_code !== 0) {
          return jsonResponse({ 
            error: data.res_message || '获取下载地址失败',
            res_code: data.res_code 
          }, 400)
        }

        return jsonResponse({
          success: true,
          downloadUrl: data.downloadUrl || '',
          fileInfo: data.fileInfo || {},
        })
      }

      return jsonResponse({ error: '不支持的网盘平台' }, 400)
    } catch (error) {
      return jsonResponse({ error: '获取下载地址失败: ' + error.message }, 500)
    }
  }

  if (path === '/api/stream' && request.method === 'GET') {
    try {
      const fileUrl = url.searchParams.get('url') || ''
      
      if (!fileUrl) {
        return jsonResponse({ error: '缺少url参数' }, 400)
      }

      return streamProxy(request, fileUrl)
    } catch (error) {
      return jsonResponse({ error: '流媒体代理失败: ' + error.message }, 500)
    }
  }

  return jsonResponse({ error: '接口不存在' }, 404)
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})
