import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))
  const userRole = ref(localStorage.getItem('userRole') || '')

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userRole.value === 'admin')

  async function login(credentials, type = 'user') {
    const endpoint = type === 'admin' ? '/api/auth/admin-login' : '/api/auth/login'
    const res = await api.post(endpoint, credentials)
    
    if (res.success) {
      token.value = res.data.token
      userInfo.value = res.data.user
      userRole.value = res.data.role
      
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('userInfo', JSON.stringify(res.data.user))
      localStorage.setItem('userRole', res.data.role)
    }
    return res
  }

  function logout() {
    token.value = ''
    userInfo.value = {}
    userRole.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userRole')
  }

  async function fetchUserInfo() {
    try {
      const res = await api.get('/api/auth/me')
      if (res.success) {
        userInfo.value = res.data
        localStorage.setItem('userInfo', JSON.stringify(res.data))
      }
    } catch (e) {
      console.error('获取用户信息失败', e)
    }
  }

  return {
    token,
    userInfo,
    userRole,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchUserInfo
  }
})
