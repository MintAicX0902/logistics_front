import request from '../utils/request';

/**
 * 发送验证码
 */
export const sendVerificationCode = (phone) => {
  return request({
    url: '/user/send-code',
    method: 'post',
    data: { phone }
  });
};

/**
 * 验证码登录
 */
export const loginByCode = (data) => {
  return request({
    url: '/user/login-by-code',
    method: 'post',
    data
  });
};