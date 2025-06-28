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

</script>  

<style scoped>  

</style>