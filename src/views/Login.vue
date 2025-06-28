<template>
  <div class="login-container">
    <div class="login-box">
      <div style="padding: 150px 30px; background-color: white;margin-left: 300px;border-radius: 10px;box-shadow: 0 0 10px rgba(194,176,231,1)">
        <el-form ref="formRef" :rules="currentRules" :model="data.form" style="width: 350px">
          <div style="margin-bottom: 30px; font-size:50px;text-align: center;font-weight: bold;font-family: 宋体; ">物流订单跟踪系统</div>
          
          <!-- 登录方式切换 -->
          <el-tabs v-model="loginType" @tab-change="handleTabChange" style="margin-bottom: 20px;">
            <el-tab-pane label="账号密码登录" name="password">
              <el-form-item prop="username" style="padding: 5px;">
                <el-input size="large" v-model="data.form.username" placeholder="请输入账号" :prefix-icon="User"></el-input>
              </el-form-item>
              <el-form-item prop="password" style="padding: 5px;">
                <el-input :show-password="true" size="large" v-model="data.form.password" placeholder="请输入密码" :prefix-icon="Lock"></el-input>
              </el-form-item>
            </el-tab-pane>
            
            <el-tab-pane label="短信验证码登录" name="sms">
              <el-form-item prop="phone" style="padding: 5px;">
                <el-input size="large" v-model="data.form.phone" placeholder="请输入手机号" :prefix-icon="Phone"></el-input>
              </el-form-item>
              <el-form-item prop="verificationCode" style="padding: 5px;">
                <el-row :gutter="10">
                  <el-col :span="16">
                    <el-input size="large" v-model="data.form.verificationCode" placeholder="请输入验证码" :prefix-icon="Message"></el-input>
                  </el-col>
                  <el-col :span="8">
                    <el-button size="large" type="primary" @click="sendCode" :disabled="codeButtonDisabled" style="width: 100%;">
                      {{ codeButtonText }}
                    </el-button>
                  </el-col>
                </el-row>
              </el-form-item>
            </el-tab-pane>
          </el-tabs>
          
          <div>
            <el-button size="large" style="width: 100%; background-color:rgb(113,73,213)" type="primary" @click="login">登 录</el-button>
          </div>
          <div style="text-align: right;font-family: 宋体;padding-top: 15px; ">
            还没有账号？请<a style="color:rgb(113,73,213) ;text-decoration: none;" href="/Register">注册</a>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import request from '../utils/request';
import { sendVerificationCode, loginByCode } from '../api/smsApi';
import { reactive, onMounted, ref, computed } from 'vue';
import { User, Lock, Phone, Message } from "@element-plus/icons-vue";
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();

// 登录方式pasword or sms
const loginType = ref('password');

// 验证码倒计时
const countdown = ref(0);
const codeButtonDisabled = computed(() => countdown.value > 0);
const codeButtonText = computed(() => countdown.value > 0 ? `${countdown.value}秒后重发` : '获取验证码');

const data = reactive({
  form: {
    username: "",
    password: "",
    phone: "",
    verificationCode: ""
  },
  passwordRules: {
    username: [
      { required: true, message: '请输入账号', trigger: 'blur' }
    ],
    password: [
      { required: true, message: "请输入密码", trigger: 'blur' }
    ]
  },
  smsRules: {
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
    ],
    verificationCode: [
      { required: true, message: '请输入验证码', trigger: 'blur' },
      { pattern: /^\d{6}$/, message: '验证码格式不正确', trigger: 'blur' }
    ]
  }
});

// 当前使用的验证规则
const currentRules = computed(() => {
  return loginType.value === 'password' ? data.passwordRules : data.smsRules;
});

const formRef = ref();

// 切换登录方式时清空表单
const handleTabChange = () => {
  formRef.value?.clearValidate();
};

// 发送验证码
const sendCode = async () => {
  // 先验证手机号
  formRef.value.validateField('phone', async (valid) => {
    if (valid) {
      try {
        const res = await sendVerificationCode(data.form.phone);
        if (res.code === "200") {
          ElMessage.success(res.msg || '验证码已发送');
          // 开始倒计时
          countdown.value = 60;
          const timer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
              clearInterval(timer);
            }
          }, 1000);
        } else {
          ElMessage.error(res.msg || '发送失败');
        }
      } catch (error) {
        ElMessage.error('发送验证码失败');
      }
    }
  });
};

// 登录
const login = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res;
        
        if (loginType.value === 'password') {
          // 账号密码登录
          res = await request({
            url: "/user/login",
            method: "post",
            headers: {
              "Content-Type": "application/json"
            },
            data: {
              username: data.form.username,
              password: data.form.password
            }
          });
        } else {
          // 验证码登录
          res = await loginByCode({
            phone: data.form.phone,
            verificationCode: data.form.verificationCode
          });
        }
        
        if (res.code === "200") {
          sessionStorage.setItem("token", res.data.token);
          localStorage.setItem("account", JSON.stringify(res.data));
          ElMessage.success('登录成功');
          
          setTimeout(() => {
            router.push('/Manger');
          }, 1000);
        } else {
          ElMessage.error(res.msg || '登录失败');
        }
      } catch (error) {
        ElMessage.error('登录失败，请稍后重试');
      }
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

/* 自定义tabs样式 */
:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__active-bar) {
  background-color: rgb(113,73,213);
}

:deep(.el-tabs__item.is-active) {
  color: rgb(113,73,213);
}

:deep(.el-tabs__item:hover) {
  color: rgb(113,73,213);
}
</style>