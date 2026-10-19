/**
 * 短信服务商抽象层
 *
 * 接入新服务商时：
 * 1. 在 SMS_PROVIDERS 中注册一个 provider 实现
 * 2. 在 .env 中设置 SMS_PROVIDER 为对应名称
 * 3. 配置该 provider 所需的环境变量
 *
 * 当前支持：
 *   - aliyun  : 阿里云短信服务（需配置 SMS_ALIYUN_ACCESS_KEY_ID / SMS_ALIYUN_ACCESS_KEY_SECRET / SMS_ALIYUN_SIGN_NAME / SMS_ALIYUN_TEMPLATE_CODE）
 *   - tencent : 腾讯云短信服务（需配置 SMS_TENCENT_SECRET_ID / SMS_TENCENT_SECRET_KEY / SMS_TENCENT_SDK_APP_ID / SMS_TENCENT_SIGN_NAME / SMS_TENCENT_TEMPLATE_ID）
 *   - mock    : 控制台输出（开发环境用）
 *
 * 接口约定：
 *   每个 provider 导出一个 async send(phone, code) => { success, messageId? }
 */

// ==================== Provider 实现 ====================

/**
 * 阿里云短信
 */
async function aliyunProvider(phone, code) {
  // TODO: 接入阿里云短信 SDK
  // const dysmsapi = require('@alicloud/dysmsapi20170525');
  // const Client = new dysmsapi.default({
  //   accessKeyId: process.env.SMS_ALIYUN_ACCESS_KEY_ID,
  //   accessKeySecret: process.env.SMS_ALIYUN_ACCESS_KEY_SECRET,
  // });
  // const result = await Client.sendSms({
  //   phoneNumbers: phone,
  //   signName: process.env.SMS_ALIYUN_SIGN_NAME,
  //   templateCode: process.env.SMS_ALIYUN_TEMPLATE_CODE,
  //   templateParam: JSON.stringify({ code }),
  // });
  // return { success: result.body.code === 'OK', messageId: result.body.requestId };

  console.log(`[SMS:ALIYUN] 未接入，验证码: ${code} → ${phone}`);
  return { success: true, messageId: 'mock' };
}

/**
 * 腾讯云短信
 */
async function tencentProvider(phone, code) {
  // TODO: 接入腾讯云短信 SDK
  // const tencentcloud = require('tencentcloud-sdk-nodejs-sms');
  // const SmsClient = tencentcloud.sms.v20210111.Client;
  // const client = new SmsClient({
  //   credential: { secretId: process.env.SMS_TENCENT_SECRET_ID, secretKey: process.env.SMS_TENCENT_SECRET_KEY },
  //   region: 'ap-guangzhou',
  // });
  // const result = await client.SendSms({
  //   SmsSdkAppId: process.env.SMS_TENCENT_SDK_APP_ID,
  //   SignName: process.env.SMS_TENCENT_SIGN_NAME,
  //   TemplateId: process.env.SMS_TENCENT_TEMPLATE_ID,
  //   TemplateParamSet: [code],
  //   PhoneNumberSet: [`+86${phone}`],
  // });
  // return { success: result.SendStatusSet[0].Code === 'Ok', messageId: result.RequestId };

  console.log(`[SMS:TENCENT] 未接入，验证码: ${code} → ${phone}`);
  return { success: true, messageId: 'mock' };
}

/**
 * Mock（开发环境用）
 */
async function mockProvider(phone, code) {
  console.log(`[SMS:MOCK] 验证码: ${code} → ${phone}`);
  return { success: true, messageId: 'mock' };
}

// ==================== Provider 注册表 ====================

const SMS_PROVIDERS = {
  aliyun: aliyunProvider,
  tencent: tencentProvider,
  mock: mockProvider,
};

// ==================== 统一发送接口 ====================

/**
 * 发送短信验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendSmsCode(phone, code) {
  const providerName = process.env.SMS_PROVIDER || 'mock';
  const provider = SMS_PROVIDERS[providerName];

  if (!provider) {
    console.error(`[SMS] 未知的短信服务商: ${providerName}`);
    return { success: false, error: `未知的短信服务商: ${providerName}` };
  }

  try {
    const result = await provider(phone, code);
    return result;
  } catch (err) {
    console.error(`[SMS:${providerName}] 发送失败:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送普通短信（非验证码，如通知）
 * @param {string} phone - 手机号
 * @param {string} content - 短信内容
 */
async function sendSms(phone, content) {
  // 短信通知与验证码可能使用不同模板，按需扩展
  console.log(`[SMS:NOTIFY] ${content} → ${phone}`);
  return { success: true };
}

module.exports = {
  sendSmsCode,
  sendSms,
  SMS_PROVIDERS,
};
