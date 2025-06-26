<template>  
<div class="card" style="margin-bottom: 20px; font-size: 18px;">
       你好，{{ data.account.username }}！欢迎使用本系统
</div>
  <div class="demo-collapse class" style="margin-bottom: 5px;">  
    <div style="margin-bottom: 15px; font-weight: bold; font-size: 22px;">系统公告</div>  
    <el-collapse v-model="data.activeName" accordion>  
      <el-collapse-item v-for="item in data.form" :key="item.id" :title="item.name" :name="item.id" >  
        <div style="padding: 20px" v-html="item.context"></div>
      </el-collapse-item>  
    </el-collapse>  
  </div>  
</template>  

<script setup>  
// import { reactive, onMounted } from 'vue';  
// import request from '../utils/request';  
// import { ElMessage } from 'element-plus';  

// // console.log(sessionStorage.getItem("token"))
// // console.log(request.getItem("token"))

// // 初始化数据对象，包含系统公告相关的数据  
// const data = reactive({  
//   form: [],  
//   activeName: 1,
//   account: JSON.parse(localStorage.getItem("account")), 
// });  

// // 用于获取系统公告信息的函数  
// const findNotice = async () => {  
//   try {  
//     const res = await request.get("/notices/selectAll");  
//     if (res.code === "200") {  
//       data.form = res.data;  
//       console.log("Fetched notices:", data.form); // 打印获取的公告数据  
//     } else {  
//       handleError(res);  
//     }  
//   } catch (error) {  
//     ElMessage.error('网络出现问题，请检查网络连接后重试');  
//   }  
// };  

// // 专门的错误处理函数，根据不同的错误码展示对应的提示信息  
// const handleError = (error) => {  
//   if (error.code === 404) {  
//     ElMessage.error('请求的系统公告资源不存在，请联系管理员');  
//   } else if (error.code === 500) {  
//     ElMessage.error('服务器内部出现错误，请稍后再试');  
//   } else {  
//     ElMessage.error(error.message);  
//   }  
// };  
// // 在组件挂载后调用获取系统公告信息的函数  
// onMounted(() => {  
//   findNotice();  
// });  
</script>  

<style scoped>  
/* 添加样式 */  
</style>