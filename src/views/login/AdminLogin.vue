<template>
  <div class="min-h-screen space-bg flex items-center justify-center p-4">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    
    <div class="glass-card p-8 w-full max-w-md fade-in-up relative z-10">
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center floating">
          <span class="text-4xl">⚡</span>
        </div>
        <h1 class="text-3xl font-bold neon-text mb-2">管理员登录</h1>
        <p class="text-white/60">云盘直链解析平台 - 后台管理系统</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">管理员账号</label>
          <input 
            v-model="username" 
            type="text" 
            class="neon-input"
            placeholder="请输入管理员账号"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">密码</label>
          <input 
            v-model="password" 
            type="password" 
            class="neon-input"
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div v-if="error" class="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {{ error }}
        </div>
        
        <button 
          type="submit" 
          class="neon-btn w-full py-3 text-lg"
          :disabled="loading"
        >
          <span v-if="loading">登录中...</span>
          <span v-else>登 录</span>
        </button>
      </form>
      
      <div class="mt-8 text-center">
        <p class="text-white/40 text-sm">
          <router-link to="/user/login" class="text-cyan-400 hover:text-cyan-300 transition">
            用户登录入口 →
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  
  error.value = ''
  loading.value = true
  
  try {
    const res = await userStore.login({
      username: username.value,
      password: password.value
    }, 'admin')
    
    if (res.success) {
      router.push('/admin/dashboard')
    } else {
      error.value = res.message || '登录失败，请检查账号密码'
    }
  } catch (e) {
    error.value = '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
