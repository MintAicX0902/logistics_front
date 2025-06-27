<template>
  <div class="all">
    <!-- 头部开始 -->
    <div style="height: 60px;background-color: rgb(113,73,213);display: flex;align-items: center;">
      <div style="width: 300px;font-family: 宋体;display: flex; align-items: center;">
        <img style="width: 40px;padding-left: 15px;" src="../assets/logo.png" alt="">
        <span style="font-size:20px; color:white">物流订单跟踪系统</span>
      </div>
      
      <!-- 新增菜单部分 -->
      <el-menu
        font-family="宋体"
        font-size="20px"
        mode="horizontal"
        background-color="rgb(0,0,0,0)"
        text-color="white"
        style="flex:1; justify-content: flex-end; border-bottom: none;"
        @select="handleMenuSelect"
      >
        <!-- 🔧 关键修改：安全访问 role -->
        <el-menu-item index="/Manger/Order" v-if="data.account?.role === '用户'">我的订单</el-menu-item>
        <el-menu-item index="/Manger/Order_Manger" v-if="data.account?.role !== '用户'">订单管理</el-menu-item>
      </el-menu>
      
      <div style="width: fit-content;display:flex;align-items: center;padding-right:10px;">
        <el-dropdown>
          <img 
            :src="userAvatar" 
            alt="用户头像" 
            style="width: 40px;height:40px ;border-radius: 50%; object-fit: cover; cursor: pointer;"
            @error="handleImageError"
          >
          <template #dropdown>
            <el-dropdown-menu style="border-right: 1px solid rgb(194,176,231,1);">
              <el-dropdown-item>
                <div @click="selfshow">个人信息</div>
              </el-dropdown-item>
              <el-dropdown-item>
                <div @click="logout">退出登录</div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 🔧 最关键修改：安全访问用户名，这是导致页面白屏的主要原因 -->
        <span style="color:white; margin-left:5px;">
          {{ data.self_account?.username || data.account?.username || '用户' }}
        </span>
      </div> 
    </div>
    
    <!-- 下面部分开始 -->
    <div style="display: flex;flex:1;">
      <div style="flex:1;background-color:rgb(250,250,247);padding: 10px;">
        <RouterView @updateUser="updateUser"/>
      </div>
    </div>
  </div>

  <AIChatWindow />
</template>

<script setup>
import { reactive, computed, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import request from '../utils/request';
import { useRouter } from 'vue-router';
import AIChatWindow from '../components/AIChatWindow.vue';

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 🔧 关键修改：添加默认空对象，防止 null 错误
const data = reactive({
  account: JSON.parse(localStorage.getItem("account")) || {},
  self_account: JSON.parse(localStorage.getItem("self-account")) || {}
});

// 计算属性获取用户头像
const userAvatar = computed(() => {
  return data.self_account?.photo || defaultAvatar
})

// 图片加载失败处理
const handleImageError = (e) => {
  console.log('头像加载失败，使用默认头像')
  e.target.src = defaultAvatar
}

// 监听用户信息更新
const handleUserInfoUpdate = () => {
  const newSelfAccount = JSON.parse(localStorage.getItem("self-account") || '{}')
  data.self_account = newSelfAccount
  console.log('导航栏头像已更新:', data.self_account?.photo)
}

// 🔧 修改：安全访问属性
console.log('账户角色:', data.account?.role)
console.log('用户信息:', data.account?.username)

const load = () => {
  // 🔧 添加：确保有必要的数据才发请求
  if (!data.account?.username || !data.account?.role) {
    console.error('缺少用户信息')
    return
  }

  request({
    url: "/user/findByUsername",
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    params: {
      role: data.account.role,
      username: data.account.username
    }
  }).then(res => {
    localStorage.setItem("self-account", JSON.stringify(res.data))
    data.self_account = res.data
  }).catch(err => {
    console.error("请求出现错误：", err);
  });
};

const handleMenuSelect = (index) => {
  router.push(index);
};

const router = useRouter();

const logout = () => {
  localStorage.removeItem("account");
  localStorage.removeItem("self-account");
  sessionStorage.removeItem("token");
  router.push("/");
};

const selfshow = () => {
  router.push("/Manger/self");
}

const updateUser = () => {
  load();
}

onMounted(() => {
  load();
  window.addEventListener('storage', handleUserInfoUpdate)
  window.addEventListener('userInfoUpdated', handleUserInfoUpdate)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleUserInfoUpdate)
  window.removeEventListener('userInfoUpdated', handleUserInfoUpdate)
})
</script>