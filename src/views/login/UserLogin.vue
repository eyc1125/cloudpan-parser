<template>
  <div class="min-h-screen space-bg flex items-center justify-center p-4">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    
    <div class="glass-card p-8 w-full max-w-md fade-in-up relative z-10">
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center floating">
          <span class="text-4xl">☁️</span>
        </div>
        <h1 class="text-3xl font-bold neon-text mb-2">云盘直链解析</h1>
        <p class="text-white/60">全能型直链解析与文件存储平台</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">账号</label>
          <input 
            v-model="account" 
            type="text" 
            class="neon-input"
            placeholder="请输入账号"
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
          <span v-else>立 即 登 录</span>
        </button>
      </form>
      
      <div class="mt-8 grid grid-cols-3 gap-4 text-center">
        <div class="p-3 rounded-lg bg-white/5">
          <div class="text-2xl mb-1">☁️</div>
          <div class="text-xs text-white/60">多网盘解析</div>
        </div>
        <div class="p-3 rounded-lg bg-white/5">
          <div class="text-2xl mb-1">🤖</div>
          <div class="text-xs text-white/60">AI智能助手</div>
        </div>
        <div class="p-3 rounded-lg bg-white/5">
          <div class="text-2xl mb-1">📤</div>
          <div class="text-xs text-white/60">文件上传</div>
        </div>
      </div>
      
      <div class="mt-6 text-center">
        <p class="text-white/40 text-sm">
          <router-link to="/admin/login" class="text-purple-400 hover:text-purple-300 transition">
            ← 管理员登录
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

const account = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!account.value || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  
  error.value = ''
  loading.value = true
  
  try {
    const res = await userStore.login({
      accountCode: account.value,
      password: password.value
    }, 'user')
    
    if (res.success) {
      router.push('/user/dashboard')
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
