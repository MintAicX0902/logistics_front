<template>
    <div class="login-container">
      <div class="login-box">
        <div style="padding: 150px 30px; background-color: white;margin-left: 300px;border-radius: 10px;box-shadow: 0 0 10px rgba(194,176,231,1)">
          <el-form ref="formRef" :rules="data.rules" :model="data.form" style="width: 350px">
            <div style="margin-bottom: 30px; font-size:50px;text-align: center;font-weight: bold;font-family: 宋体; ">欢 迎 注 册</div>
            <el-form-item prop="username" style="padding: 5px;">
              <el-input size="large" v-model="data.form.username" placeholder="请输入账号" :prefix-icon="User"></el-input>
            </el-form-item>
            <el-form-item prop="password" style="padding: 5px;">
              <el-input :show-password="true" size="large" v-model="data.form.password" placeholder="请输入密码" :prefix-icon="Lock"></el-input>
            </el-form-item>
            <el-form-item prop="confirmpassword" style="padding: 5px;">
              <el-input :show-password="true" size="large" v-model="data.form.confirmpassword" placeholder="请确认密码" :prefix-icon="Lock"></el-input>
            </el-form-item>
            <div >
            <el-button size="large" style="width: 100%; background-color:rgb(113,73,213)" type="primary" @click="register">注 册</el-button>
            </div>
            <div style="text-align: right;font-family: 宋体;padding-top: 15px; ">
              已有账号？请<a style="color:rgb(113,73,213) ;text-decoration: none;" href="/">登录</a>
            </div>
          </el-form>
        </div>
      </div></div>
  </template>
  
  <script setup>
  import request from '../utils/request';
  import { reactive, onMounted,ref} from 'vue';
  import {User,Lock} from "@element-plus/icons-vue";
  import { ElMessage } from 'element-plus';
  const formRef=ref()
  const validatePass = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value !== data.form.password) {
    callback(new Error("密码不一致"))
  } else {
    callback()
  }
}
  
  const data = reactive({
    form: {username: "",
      password: ""},
    // 验证登入信息是否正确
    rules:{
      username:[
        {required:true,message:'请输入账号',trigger:'blur'}
      ],
      password:[
        {required:true,message:"请输入密码",trigger:'blur'}
      ],
      confirmpassword:[
        {validator:validatePass,trigger:'blur'}
      ] }
  })
  
  const register = () => {
    formRef.value.validate((valid) => {
      if (valid) {
        request({
          url: "/user/register",
          method: "post",
          headers: {
            "Content-Type": "application/json"
          },
          data:data.form
        }).then(res => {
          if (res.code === "200") {
            ElMessage.success('注册成功')
            setTimeout(() => {
              location.href = '/';
            }, 1000); // 延迟1秒执行
  
  
          } else {
            ElMessage.error(res.msg)
            console.log(res)
          }
        });
      }
    });
  };
  </script>
  
  <style scoped>
  .login-container {
    height: 100vh;
    overflow: hidden;
    background-image: url("../assets/images/back.png");
    background-size: cover;
    background-position: 0 -100px;
  }
  .login-box {
    position: absolute;
    width: 50%;
    height: 100%;
    left: 26px;
    display: flex;
    align-items: center;
  }
  </style>