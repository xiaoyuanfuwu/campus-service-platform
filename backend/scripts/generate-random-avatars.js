// ============================================================
// 生成 30 个呆萌卡通风格默认头像 → backend/uploads/avatars/random/
// 用法: node scripts/generate-random-avatars.js
// 依赖: sharp（后端 package.json 已有）
// 输出: avatar-01.png ~ avatar-30.png（200x200 PNG，纯矢量绘制）
// ============================================================
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'uploads', 'avatars', 'random');

// 颜色变暗（用于帽子带、蝴蝶结中心等深色细节）
function darken(hex, amount = 40) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// 30 组配置：背景色 / 发色 / 装饰色 / 发型
// A = 齐刘海+呆毛  B = 双丸子头  C = 贝雷帽+蝴蝶结
const COMBOS = [
  // --- A 组：齐刘海 + 呆毛 ---
  { bg: '#FFB7C5', hair: '#4A3B32', accent: '#FF8FAB', type: 'A' },
  { bg: '#A7D8F0', hair: '#6B4A3A', accent: '#4A90C4', type: 'A' },
  { bg: '#B8E6C8', hair: '#2F2A2A', accent: '#5BB98A', type: 'A' },
  { bg: '#FFE3A3', hair: '#8B5E3C', accent: '#E8B84A', type: 'A' },
  { bg: '#D6C1F0', hair: '#5A4A6A', accent: '#8A6AC8', type: 'A' },
  { bg: '#FFC9A8', hair: '#C89B6F', accent: '#E88A4A', type: 'A' },
  { bg: '#A8E6CF', hair: '#5A3E2B', accent: '#3FB8A0', type: 'A' },
  { bg: '#F8C8DC', hair: '#9A9AA8', accent: '#D86A9A', type: 'A' },
  { bg: '#B8C8E8', hair: '#7A4A32', accent: '#6A7AC8', type: 'A' },
  { bg: '#FFD9B8', hair: '#3A3A3A', accent: '#E0A04A', type: 'A' },
  // --- B 组：双丸子头 ---
  { bg: '#FFB7C5', hair: '#8B5E3C', accent: '#FF8FAB', type: 'B' },
  { bg: '#A7D8F0', hair: '#4A3B32', accent: '#4A90C4', type: 'B' },
  { bg: '#B8E6C8', hair: '#6B4A3A', accent: '#5BB98A', type: 'B' },
  { bg: '#FFE3A3', hair: '#2F2A2A', accent: '#E8B84A', type: 'B' },
  { bg: '#D6C1F0', hair: '#8B5E3C', accent: '#8A6AC8', type: 'B' },
  { bg: '#FFC9A8', hair: '#5A4A6A', accent: '#E88A4A', type: 'B' },
  { bg: '#A8E6CF', hair: '#C89B6F', accent: '#3FB8A0', type: 'B' },
  { bg: '#F8C8DC', hair: '#5A3E2B', accent: '#D86A9A', type: 'B' },
  { bg: '#B8C8E8', hair: '#9A9AA8', accent: '#6A7AC8', type: 'B' },
  { bg: '#FFD9B8', hair: '#7A4A32', accent: '#E0A04A', type: 'B' },
  // --- C 组：贝雷帽 + 蝴蝶结 ---
  { bg: '#FFB7C5', hair: '#4A3B32', accent: '#E86A8A', type: 'C' },
  { bg: '#A7D8F0', hair: '#6B4A3A', accent: '#4A90C4', type: 'C' },
  { bg: '#B8E6C8', hair: '#2F2A2A', accent: '#5BB98A', type: 'C' },
  { bg: '#FFE3A3', hair: '#8B5E3C', accent: '#E8B84A', type: 'C' },
  { bg: '#D6C1F0', hair: '#5A4A6A', accent: '#8A6AC8', type: 'C' },
  { bg: '#FFC9A8', hair: '#C89B6F', accent: '#E88A4A', type: 'C' },
  { bg: '#A8E6CF', hair: '#5A3E2B', accent: '#3FB8A0', type: 'C' },
  { bg: '#F8C8DC', hair: '#9A9AA8', accent: '#D86A9A', type: 'C' },
  { bg: '#B8C8E8', hair: '#7A4A32', accent: '#6A7AC8', type: 'C' },
  { bg: '#FFD9B8', hair: '#3A3A3A', accent: '#E0A04A', type: 'C' },
];

function buildSVG({ bg, hair, accent, type }) {
  const face = '#FFE3CD';
  const p = [];
  // 背景圆角底
  p.push(`<rect width="200" height="200" rx="44" fill="${bg}"/>`);
  // 底部淡淡阴影
  p.push(`<ellipse cx="100" cy="176" rx="36" ry="7" fill="rgba(0,0,0,0.06)"/>`);
  // 耳朵
  p.push(`<circle cx="53" cy="112" r="10" fill="${face}"/>`);
  p.push(`<circle cx="147" cy="112" r="10" fill="${face}"/>`);
  // 脸
  p.push(`<ellipse cx="100" cy="110" rx="48" ry="44" fill="${face}"/>`);
  // 眼睛（大圆 + 高光）
  p.push(`<circle cx="80" cy="103" r="8.5" fill="#3D2C2E"/>`);
  p.push(`<circle cx="120" cy="103" r="8.5" fill="#3D2C2E"/>`);
  p.push(`<circle cx="82.5" cy="100" r="3" fill="#ffffff"/>`);
  p.push(`<circle cx="122.5" cy="100" r="3" fill="#ffffff"/>`);
  p.push(`<circle cx="77.5" cy="106.5" r="1.6" fill="#ffffff" opacity="0.8"/>`);
  p.push(`<circle cx="117.5" cy="106.5" r="1.6" fill="#ffffff" opacity="0.8"/>`);
  // 腮红
  p.push(`<circle cx="65" cy="122" r="7.5" fill="#FF9EB5" opacity="0.6"/>`);
  p.push(`<circle cx="135" cy="122" r="7.5" fill="#FF9EB5" opacity="0.6"/>`);
  // 微笑
  p.push(`<path d="M 88 124 Q 100 135 112 124" stroke="#C96F6F" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);

  if (type === 'A') {
    // 齐刘海（波浪下缘）+ 呆毛
    p.push(`<path d="M 52 106 Q 52 62 100 62 Q 148 62 148 106 Q 132 90 118 93 Q 106 84 92 93 Q 76 90 52 106 Z" fill="${hair}"/>`);
    p.push(`<path d="M 100 62 Q 106 46 120 44" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
    p.push(`<circle cx="121" cy="43" r="4" fill="${hair}"/>`);
  } else if (type === 'B') {
    // 双丸子头 + 弧形刘海
    p.push(`<circle cx="60" cy="50" r="17" fill="${hair}"/>`);
    p.push(`<circle cx="140" cy="50" r="17" fill="${hair}"/>`);
    p.push(`<circle cx="60" cy="50" r="6" fill="rgba(255,255,255,0.18)"/>`);
    p.push(`<circle cx="140" cy="50" r="6" fill="rgba(255,255,255,0.18)"/>`);
    p.push(`<path d="M 52 108 Q 66 78 100 76 Q 134 78 148 108 Q 132 92 100 92 Q 68 92 52 108 Z" fill="${hair}"/>`);
  } else {
    // C：贝雷帽 + 侧边蝴蝶结
    p.push(`<path d="M 44 64 C 44 32 156 32 156 64 Z" fill="${accent}"/>`);
    p.push(`<ellipse cx="100" cy="64" rx="58" ry="13" fill="${accent}"/>`);
    p.push(`<rect x="44" y="60" width="112" height="6" rx="3" fill="${darken(accent)}"/>`);
    p.push(`<circle cx="100" cy="38" r="6" fill="${darken(accent)}"/>`);
    // 蝴蝶结
    p.push(`<path d="M 152 118 C 141 105 141 131 152 118 Z" fill="${accent}"/>`);
    p.push(`<path d="M 152 118 C 163 105 163 131 152 118 Z" fill="${accent}"/>`);
    p.push(`<circle cx="152" cy="118" r="4" fill="${darken(accent)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">${p.join('')}</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (let i = 0; i < COMBOS.length; i++) {
    const svg = buildSVG(COMBOS[i]);
    const file = path.join(OUT_DIR, `avatar-${String(i + 1).padStart(2, '0')}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    console.log('✅', path.relative(path.join(__dirname, '..'), file));
  }
  console.log(`\n完成：共生成 ${COMBOS.length} 个头像 → ${OUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
