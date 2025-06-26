<template>
  <el-dialog 
    title="支付订单" 
    v-model="visible" 
    width="600px"
    :before-close="handleClose"
  >
    <div class="payment-dialog">
      <div class="order-info">
        <h3>订单信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="运单号">{{ orderInfo.code }}</el-descriptions-item>
          <el-descriptions-item label="运费">￥{{ orderInfo.cost || '计算中...' }}</el-descriptions-item>
          <el-descriptions-item label="出发地">{{ orderInfo.startAddr }}</el-descriptions-item>
          <el-descriptions-item label="目的地">{{ orderInfo.endAddr }}</el-descriptions-item>
          <el-descriptions-item label="货物重量">{{ orderInfo.allweight }} 吨</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ orderInfo.yundanName }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="payment-method">
        <h3>支付方式</h3>
        <el-radio-group v-model="paymentMethod">
          <el-radio label="ALIPAY">
            <i class="el-icon-wallet" style="margin-right: 5px;"></i>
            支付宝支付
          </el-radio>
        </el-radio-group>
      </div>

      <div class="payment-status" v-if="paymentStatus">
        <el-alert 
          :title="paymentStatus" 
          :type="paymentStatusType" 
          show-icon 
          :closable="false"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose" :disabled="paying">取消</el-button>
      <el-button 
        type="primary" 
        @click="handlePay" 
        :loading="paying"
        :disabled="paying"
      >
        {{ paying ? '支付中...' : '立即支付' }}
      </el-button>
    </template>

    <!-- 支付表单容器 -->
    <div id="alipay-form-container" style="display: none;"></div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orderInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'paymentSuccess']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const paymentMethod = ref('ALIPAY');
const paying = ref(false);
const paymentStatus = ref('');
const paymentStatusType = ref('info');

const handlePay = async () => {
  if (!props.orderInfo.code) {
    ElMessage.error('运单信息不完整');
    return;
  }

  paying.value = true;
  paymentStatus.value = '正在创建支付订单...';
  paymentStatusType.value = 'info';

  try {
    const response = await request({
      url: '/payment/create',
      method: 'post',
      data: {
        yundanCode: props.orderInfo.code,
        paymentMethod: paymentMethod.value
      }
    });

    if (response.code === '200') {
      paymentStatus.value = '支付订单创建成功，正在跳转到支付页面...';
      
      // 创建支付表单并提交
      const formContainer = document.getElementById('alipay-form-container');
      formContainer.innerHTML = response.data.htmlForm;
      const form = formContainer.querySelector('form');
      
      if (form) {
        // 监听支付结果
        startPaymentStatusCheck();
        
        // 提交表单到支付宝
        form.submit();
        
        paymentStatus.value = '已跳转到支付宝支付页面，请完成支付';
        paymentStatusType.value = 'warning';
      } else {
        throw new Error('支付表单创建失败');
      }
    } else {
      throw new Error(response.msg || '创建支付订单失败');
    }
  } catch (error) {
    console.error('支付失败:', error);
    paymentStatus.value = '支付失败: ' + error.message;
    paymentStatusType.value = 'error';
    paying.value = false;
  }
};

const startPaymentStatusCheck = () => {
  const checkInterval = setInterval(async () => {
    try {
      const response = await request({
        url: `/payment/status/${props.orderInfo.code}`,
        method: 'get'
      });

      if (response.code === '200' && response.data === true) {
        clearInterval(checkInterval);
        paymentStatus.value = '支付成功！';
        paymentStatusType.value = 'success';
        paying.value = false;

        ElMessage.success('支付成功！');
        
        // 延迟一下再触发刷新，确保后端状态已更新
        setTimeout(() => {
          emit('paymentSuccess');
        }, 1000);
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);
    }
  }, 2000); // 改为2秒查询一次，更频繁

  // 3分钟后停止查询
  setTimeout(() => {
    clearInterval(checkInterval);
    if (paying.value) {
      paymentStatus.value = '支付超时，请重试';
      paymentStatusType.value = 'error';
      paying.value = false;
    }
  }, 180000);
};

const handleClose = () => {
  if (paying.value) {
    ElMessage.warning('支付进行中，请勿关闭窗口');
    return;
  }
  
  visible.value = false;
  paymentStatus.value = '';
  paying.value = false;
};
</script>

<style scoped>
.payment-dialog {
  padding: 20px 0;
}

.order-info, .payment-method {
  margin-bottom: 20px;
}

.payment-method h3, .order-info h3 {
  margin-bottom: 15px;
  color: #303133;
}

.payment-status {
  margin-top: 20px;
}

.el-radio {
  margin-right: 20px;
}
</style>