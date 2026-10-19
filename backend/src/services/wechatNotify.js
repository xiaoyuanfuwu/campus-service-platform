/**
 * 微信订阅消息通知服务
 * 接单时通过微信服务号模板消息通知发布者
 */
const https = require('https');

const APPID = process.env.WECHAT_APPID;
const SECRET = process.env.WECHAT_SECRET;

// 缓存 access_token
let cachedToken = null;
let tokenExpireTime = 0;

/**
 * 获取微信 access_token
 */
function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (cachedToken && Date.now() < tokenExpireTime) {
      return resolve(cachedToken);
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            cachedToken = result.access_token;
            tokenExpireTime = Date.now() + (result.expires_in - 300) * 1000;
            console.log('[wechatNotify] 获取 access_token 成功');
            resolve(result.access_token);
          } else {
            console.error('[wechatNotify] 获取 access_token 失败:', result);
            reject(new Error(result.errmsg || '获取 access_token 失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 发送订阅消息（模板消息）
 */
async function sendSubscribeMessage(openid, templateId, data, page) {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    const body = JSON.stringify({
      touser: openid,
      template_id: templateId,
      page: page || '',
      data: data,
      miniprogram_state: 'formal',
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(responseData)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.errcode === 0) {
      console.log('[wechatNotify] 模板消息发送成功, openid:', openid);
      return { success: true };
    } else {
      console.error('[wechatNotify] 模板消息发送失败:', result.errmsg);
      return { success: false, error: result.errmsg };
    }
  } catch (err) {
    console.error('[wechatNotify] 发送异常:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 通知发布者：有人接了你的单
 */
async function notifyOrderTaken(publisher, post, taker, templateId) {
  if (!publisher || !publisher.openid) {
    console.log('[wechatNotify] 发布者无 openid，跳过通知');
    return { success: false, reason: 'no_openid' };
  }
  if (!templateId) {
    console.log('[wechatNotify] 无模板 ID，跳过通知');
    return { success: false, reason: 'no_template' };
  }

  const title = (post.title || '快递代取').substring(0, 20);
  const takerName = (taker.nickName || '同学').substring(0, 10);
  const time = new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const data = {
    thing17: { value: title },
    phrase8: { value: '接单通知' },
    time3: { value: time },
    phrase25: { value: takerName + ' 已接单' },
    thing7: { value: '请及时联系对方完成取件' },
  };

  return await sendSubscribeMessage(publisher.openid, templateId, data, '/pages/express/express');
}

module.exports = { getAccessToken, sendSubscribeMessage, notifyOrderTaken };
