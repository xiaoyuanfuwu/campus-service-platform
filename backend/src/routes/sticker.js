const express = require('express');
const { createModel } = require('../models/mysql');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 获取 sticker_packs 模型
const Pack = createModel('sticker_packs', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['is_active'],
});

// 拼接静态资源 host
function getHost(req) {
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * GET /api/stickers/packs
 * 列出所有可用表情包
 */
router.get('/packs', async (req, res) => {
  try {
    const packs = await Pack.find({ is_active: 1 }, null, { orderBy: { id: 'ASC' } });
    const host = getHost(req);
    const result = packs.map(p => ({
      ...p,
      cover: p.cover ? (p.cover.startsWith('http') ? p.cover : `${host}${p.cover}`) : '',
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[sticker] listPacks error:', err);
    res.json({ success: false, message: '获取表情包列表失败' });
  }
});

/**
 * GET /api/stickers/pack/:id
 * 获取某个表情包的 sticker 列表
 */
router.get('/pack/:id', async (req, res) => {
  try {
    const packId = parseInt(req.params.id);
    const pack = await Pack.findById(packId);
    if (!pack || !pack.is_active) {
      return res.json({ success: false, message: '表情包不存在' });
    }

    const host = getHost(req);
    const baseUrl = `${host}/uploads/stickers/${packId}`;
    let stickers = [];

    // 优先读取 manifest.json
    const manifestPath = path.join(__dirname, '..', '..', 'uploads', 'stickers', String(packId), 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      stickers = (manifest.stickers || []).map(name => ({
        name,
        url: `${baseUrl}/${name}`,
      }));
    } else {
      // 没有 manifest.json，扫描目录
      const dirPath = path.join(__dirname, '..', '..', 'uploads', 'stickers', String(packId));
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
        stickers = files.map(name => ({
          name,
          url: `${baseUrl}/${name}`,
        }));
      }
    }

    res.json({
      success: true,
      data: {
        id: pack.id,
        name: pack.name,
        sticker_count: pack.sticker_count,
        version: pack.version,
        stickers,
      },
    });
  } catch (err) {
    console.error('[sticker] getPack error:', err);
    res.json({ success: false, message: '获取表情包失败' });
  }
});

router.get('/emoji/list', (req, res, next) => {
  try {
    const manifestPath = path.join(__dirname, '../../uploads/emojis/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const baseUrl = '/uploads/emojis';
    const list = (manifest.emojis || []).map(name => ({ name, url: baseUrl + '/' + name }));
    res.json({ success: true, data: { emojis: list, count: list.length } });
  } catch(e) { next(e); }
});

module.exports = router;
