<template >
    <div class="all">
        <!-- 头部开始 -->
         <div style="height: 60px;background-color: rgb(113,73,213);display: flex;align-items: center;">
          <div style="width: 300px;font-family: 宋体;display: flex; align-items: center;">
            <img style="width: 40px;padding-left: 15px;" src="../assets/logo.png" alt="" >
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
    <!-- <el-menu-item index="/Manger/homeView">公告</el-menu-item> -->
    <el-menu-item index="/Manger/Order" v-if="data.account.role === '用户'">我的订单</el-menu-item>
    <el-menu-item index="/Manger/Order_Manger"v-if="data.account.role !== '用户'">订单管理</el-menu-item>
          </el-menu>
          <div style="width: fit-content;display:flex;align-items: center;padding-right:10px ;">
            <el-dropdown>
            <img 
              :src="userAvatar" 
              alt="用户头像" 
              style="width: 40px;height:40px ;border-radius: 50%; object-fit: cover; cursor: pointer;"
              @error="handleImageError"
            >
            <template #dropdown>
              <el-dropdown-menu  style="border-right: 1px solid rgb(194,176,231,1);">
                <el-dropdown-item >
                  <div @click="selfshow">
                  个人信息</div>
                </el-dropdown-item>
                <el-dropdown-item >
                  <div @click="logout">
                  退出登录
                </div>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span style="color:white; margin-left:5px ;" >{{ data.self_account.username }}</span>
          </div> 
        </div>
    </div>
    <!-- 头部结束 -->
    
     <!-- 下面部分开始 -->
      <div style="display: flex;flex:1;">
       <!-- 右侧主体区域开始 -->
        <div style="flex:1;background-color:rgb(250,250,247);padding: 10px;">
          <RouterView @updateUser="updateUser"/>
        </div>
    </div>
      <!-- 下面部分结束 -->
</template>

<script setup>
  import { reactive, computed, onMounted, onUnmounted } from 'vue';
  import { RouterView } from 'vue-router';
  import request from '../utils/request';
  import { useRouter } from 'vue-router';

  // 默认头像
  const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

  const data = reactive({
    account: JSON.parse(localStorage.getItem("account")),
    self_account: JSON.parse(localStorage.getItem("self-account"))
  });

  // 计算属性获取用户头像
  const userAvatar = computed(() => {
    // 优先使用用户上传的头像，如果没有则使用默认头像
    return data.self_account?.photo || defaultAvatar
  })

  // 图片加载失败处理
  const handleImageError = (e) => {
    console.log('头像加载失败，使用默认头像')
    e.target.src = defaultAvatar
  }

  // 监听用户信息更新
  const handleUserInfoUpdate = () => {
    // 重新加载用户信息
    data.self_account = JSON.parse(localStorage.getItem("self-account") || '{}')
    console.log('导航栏头像已更新:', data.self_account?.photo)
  }

  console.log(data.account.role)
  console.log("用户信息"+data.account.username)

  const load = () => {
    request({
      url: "/user/findByUsername",
      method: "post",
      headers: {
          "Content-Type": "application/json"
      },
      params:{
        role:data.account.role,
        username:data.account.username
      }
    }).then(res => {
      localStorage.setItem("self-account",JSON.stringify(res.data))
      // 更新响应式数据
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
    // 重新加载用户信息
    load();
  }

  // 页面加载时和卸载时的处理
  onMounted(() => {
    load();
    
    // 监听 localStorage 变化（跨标签页同步）
    window.addEventListener('storage', handleUserInfoUpdate)
    
    // 监听自定义事件（同一页面内更新）
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', handleUserInfoUpdate)
    window.removeEventListener('userInfoUpdated', handleUserInfoUpdate)
  })
</script>
    
<style>
  .el-menu .is-active{
    background:rgb(233, 227, 241) !important;
  }
</style>