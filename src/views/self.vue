<template>
  <div class="user-profile">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人信息管理</span>
        </div>
      </template>
      
      <div class="avatar-section">
        <el-upload
          :auto-upload="true"
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="customUpload"
          class="avatar-uploader"
        >
          <div class="avatar-upload-wrapper">
            <img v-if="userInfo.photo" :src="userInfo.photo" class="avatar" />
            <img v-else :src="defaultAvatar" class="avatar" />
            <div class="upload-overlay">
              <el-icon><Camera /></el-icon>
            </div>
          </div>
        </el-upload>
        <div class="avatar-tip">点击上传头像</div>
      </div>
      
      <!-- 用户信息表单 -->
      <el-form 
        ref="formRef"
        :model="userInfo" 
        label-width="100px" 
        style="max-width: 500px; margin: 0 auto;"
      >
        <el-form-item label="用户名">
          <el-input v-model="userInfo.username" disabled />
        </el-form-item>
        
        <el-form-item label="姓名">
          <el-input v-model="userInfo.name" placeholder="请输入姓名" />
        </el-form-item>
        
        <el-form-item label="性别">
          <el-radio-group v-model="userInfo.sex_types">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="电话">
          <el-input v-model="userInfo.phone" placeholder="请输入电话号码" />
        </el-form-item>
        
        <el-form-item label="邮箱">
          <el-input v-model="userInfo.email" placeholder="请输入邮箱" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="updateUserInfo" :loading="loading">
            保存修改
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import request from '../utils/request'

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 表单引用
const formRef = ref()
const loading = ref(false)
const uploading = ref(false)

// 用户信息
const userInfo = reactive({
  id: null,
  username: '',
  name: '',
  photo: '',
  sex_types: 1,
  phone: '',
  email: ''
})

// === Element Plus 上传配置 ===
// 自定义上传方法
const customUpload = async (options) => {
  console.log('=== 自定义上传开始 ===')
  console.log('上传选项:', options)
  
  const { file, onProgress, onSuccess, onError } = options
  const token = sessionStorage.getItem('token')
  
  console.log('当前 token:', token)
  
  if (!token) {
    ElMessage.error('Token 已失效，请重新登录')
    onError(new Error('Token 已失效'))
    return
  }
  
  // 创建 FormData
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    console.log('发送上传请求...')
    uploading.value = true
    
    // 使用你的 request 工具发送请求
    const res = await request.post('/yonghu/avatar/upload', formData, {
      headers: {
        'token': token,
        // 不要设置 Content-Type，让浏览器自动设置
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress({ percent: percentCompleted })
      }
    })
    
    console.log('上传响应:', res)
    
    if (res.code === '200') {
      // 更新用户头像
      userInfo.photo = res.data
      
      // 更新 localStorage
      const selfAccount = JSON.parse(localStorage.getItem("self-account") || '{}')
      selfAccount.photo = res.data
      localStorage.setItem("self-account", JSON.stringify(selfAccount))
      
      window.dispatchEvent(new CustomEvent('userInfoUpdated'))

      ElMessage.success('头像上传成功')
      onSuccess(res, file)
    } else {
      ElMessage.error(res.msg || '上传失败')
      onError(new Error(res.msg || '上传失败'))
    }
  } catch (error) {
    console.error('上传失败:', error)
    
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error('上传失败，请稍后重试')
    }
    
    onError(error)
  } finally {
    uploading.value = false
  }
}

// 上传前验证
const beforeUpload = (file) => {
  console.log('=== 准备上传文件 ===')
  console.log('文件信息:', file)
  console.log('文件类型:', file.type)
  console.log('文件大小:', (file.size / 1024 / 1024).toFixed(2) + 'MB')
  
  const isImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5
  
  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG/GIF 格式的图片!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  
  // 检查 token
  const token = sessionStorage.getItem('token')
  if (!token) {
    ElMessage.error('Token 已失效，请重新登录')
    return false
  }
  
  ElMessage.info('正在上传头像...')
  return true
}

// === 其他功能保持不变 ===
// 加载用户信息
const loadUserInfo = async () => {
  try {
    const res = await request.get('/yonghu/info')
    if (res.code === '200') {
      Object.assign(userInfo, res.data)
      localStorage.setItem("self-account", JSON.stringify(res.data))
    } else {
      ElMessage.error(res.msg || '获取用户信息失败')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    const selfAccount = JSON.parse(localStorage.getItem("self-account") || '{}')
    if (selfAccount && selfAccount.id) {
      Object.assign(userInfo, selfAccount)
    }
  }
}

// 更新用户信息
const updateUserInfo = async () => {
  loading.value = true
  try {
    const updateData = {
      name: userInfo.name,
      phone: userInfo.phone,
      email: userInfo.email,
      sex_types: userInfo.sex_types
    }
    
    const res = await request.put('/yonghu/update', updateData)
    if (res.code === '200') {
      ElMessage.success('更新成功')
      await loadUserInfo()

      window.dispatchEvent(new CustomEvent('userInfoUpdated'))

      emit('updateUser')
    } else {
      ElMessage.error(res.msg || '更新失败')
    }
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  const selfAccount = JSON.parse(localStorage.getItem("self-account") || '{}')
  Object.assign(userInfo, selfAccount)
  ElMessage.info('已重置为原始数据')
}

// 定义 emit
const emit = defineEmits(['updateUser'])

// 页面加载时
onMounted(() => {
  // 检查 token
  console.log('=== 页面加载时 Token 状态 ===')
  const token = sessionStorage.getItem('token')
  console.log('Token 存在:', !!token)
  console.log('Token 内容:', token)
  
  if (!token) {
    ElMessage.error('请先登录')
    return
  }
  
  const selfAccount = JSON.parse(localStorage.getItem("self-account") || '{}')
  if (selfAccount && selfAccount.id) {
    Object.assign(userInfo, selfAccount)
  }
  
  loadUserInfo()
})


</script>

<style scoped>
.user-profile {
  padding: 20px;
}

.profile-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.avatar-section {
  text-align: center;
  margin-bottom: 30px;
}

.avatar-uploader {
  display: inline-block;
}

.avatar-upload-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  cursor: pointer;
  overflow: hidden;
  border-radius: 50%;
  border: 2px dashed #d9d9d9;
  transition: border-color 0.3s;
}

.avatar-upload-wrapper:hover {
  border-color: #409eff;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 50%;
}

.avatar-upload-wrapper:hover .upload-overlay {
  opacity: 1;
}

.upload-overlay .el-icon {
  font-size: 24px;
  color: white;
}

.avatar-tip {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}
</style>