const BASE_URL = ''

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async request(url, options = {}) {
    const fullUrl = this.baseURL + url
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    }

    try {
      const response = await fetch(fullUrl, config)
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          localStorage.removeItem('userRole')
          window.location.href = '/#/user/login'
        }
        return {
          success: false,
          message: data.message || '请求失败',
          data: null
        }
      }
      
      return data
    } catch (error) {
      console.error('API请求错误:', error)
      return {
        success: false,
        message: error.message || '网络错误',
        data: null
      }
    }
  }

  get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url
    return this.request(fullUrl, { method: 'GET' })
  }

  post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  delete(url) {
    return this.request(url, { method: 'DELETE' })
  }

  upload(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      const token = localStorage.getItem('token')
      
      xhr.open('POST', this.baseURL + url)
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data)
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      }

      xhr.onerror = () => {
        reject(new Error('上传失败'))
      }

      xhr.send(formData)
    })
  }
}

const api = new ApiClient()
export { api }
export default api
