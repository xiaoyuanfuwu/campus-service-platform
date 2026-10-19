// api.js — API 请求封装 v2
// ======== 运行时 API Base 配置 ========
// 默认连生产后端；可通过 localStorage 覆盖、或在 console 运行时切换。
//
// Console 用法：
//   apiSet('http://localhost:3000')             临时切换到本地后端
//   apiSet(null)                                 重置回默认 (app.suyu.ink)
//   apiReset()                                   完全清空自定义，恢复硬编码默认
//   apiInfo()                                    查看当前生效的 base
//
const STORAGE = 'treehole_admin_api_base_v2';
// 本地开发时自动连本地后端，部署到服务器时连生产后端
const DEFAULT_API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://app.suyu.ink';

function getApiBase() {
  const custom = localStorage.getItem(STORAGE);
  if (custom !== null && custom !== '' && custom !== 'null') return custom.replace(/\/+$/, '');
  return DEFAULT_API_BASE;
}

// 让模块外部也能调用的工具
export function apiSet(base) {
  if (base === null || base === undefined || base === '') {
    localStorage.removeItem(STORAGE);
  } else {
    localStorage.setItem(STORAGE, String(base).trim().replace(/\/+$/, ''));
  }
  console.info('[api] base →', getApiBase());
}
export function apiReset() { apiSet(null); }
export function apiInfo() {
  return {
    storageKey: STORAGE,
    customSet: localStorage.getItem(STORAGE),
    effective: getApiBase(),
    defaults: { DEFAULT_API_BASE },
  };
}

// 暴露到 window 给 console 用
if (typeof window !== 'undefined') {
  window.apiSet = apiSet;
  window.apiReset = apiReset;
  window.apiInfo = apiInfo;
}

// ======== Auth ========
let AUTH = localStorage.getItem('admin_token') || '';

export function setAuth(t) { AUTH = t; localStorage.setItem('admin_token', t); }
export function clearAuth() {
  AUTH = '';
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_info');
}
export function getAuth() { return AUTH; }

// ======== api() — 真实请求 ========
export async function api(method, path, body) {
  const base = getApiBase();
  const url = base + path;

  // path 必须是 /xxx 开头
  if (!path.startsWith('/')) path = '/' + path;

  const h = { 'Content-Type': 'application/json' };
  if (AUTH) h['Authorization'] = 'Bearer ' + AUTH;

  const opts = { method, headers: h };
  if (body && method !== 'GET' && method !== 'HEAD') {
    opts.body = JSON.stringify(body);
  }

  try {
    const r = await fetch(url, opts);
    // 401 处理：登录接口的 401（账号/密码错误、被禁用等）透传后端真实消息；
    // 其余接口 401 视为登录过期，登出并回登录页（仅当已登录过的情况下才跳）
    if (r.status === 401 && path !== '/api/admin/login') {
      const wasAuthed = !!AUTH;
      clearAuth();
      if (wasAuthed && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        // 用 setTimeout 避免和当前请求栈混在一起
        setTimeout(() => {
          try { window.location.reload(); } catch (e) {}
        }, 50);
      }
      return { success: false, message: '登录已过期，请重新登录', code: 401 };
    }
    let data;
    try { data = await r.json(); } catch { data = { success: false, message: '响应不是 JSON (HTTP ' + r.status + ')' }; }
    // 业务层一般有 success 字段；为了兼容有些接口没 success 包装的情况
    if (typeof data.success === 'undefined') data.success = r.ok;
    return data;
  } catch (e) {
    // CORS / 网络错误
    console.error('[api] fetch failed:', url, e);
    return {
      success: false,
      message: '无法连接后端 ' + base + '（' + (e?.message || '网络错误') + '）。Console 跑 apiInfo() 看当前 base；apiSet("https://...") 切换。',
      networkError: true,
    };
  }
}

// 启动日志
console.info('%c[admin api] base = ' + getApiBase(), 'color:#7C5CFF;font-weight:bold');
console.info('%c[admin api] 切换: apiSet("https://...") | apiSet(null) | apiInfo()', 'color:#999');
