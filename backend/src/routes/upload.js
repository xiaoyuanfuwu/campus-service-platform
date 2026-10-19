const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/auth');

// 所有上传路由需要登录
router.use(authenticate);

// 配置 multer 内存存储（不再直接落盘，方便 sharp 处理）
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('仅支持 JPG、PNG、GIF、WebP 格式的图片', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  // 接收最大 20MB 原图（手机原图通常 5~15MB）；后面 sharp 压缩到 ≤300KB
  limits: { fileSize: 20 * 1024 * 1024 },
});

const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

/**
 * 用 sharp 压缩图片到 ≤300KB / 1080P / 80% 质量（自适应质量阶梯）
 * @returns {Promise<string>} 落盘后的文件名
 */
async function compressAndSave(buffer, originalName) {
  const ext = path.extname(originalName) || '.jpg';
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `${Date.now()}-${Math.floor(Math.random()*1e6)}${ext}`;
  const destPath = path.join(UPLOAD_DIR, filename);

  // 1) 缩到最长边 1080
  let pipeline = sharp(buffer).rotate();  // .rotate() 根据 EXIF 自动转正
  const meta = await sharp(buffer).metadata();
  const longEdge = Math.max(meta.width || 0, meta.height || 0);
  if (longEdge > 1080) {
    pipeline = pipeline.resize({
      width: longEdge === meta.width ? 1080 : null,
      height: longEdge === meta.height ? 1080 : null,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // 2) 质量阶梯降到 ≤300KB
  const qualities = [80, 70, 60, 50, 40];
  let buf;
  for (const q of qualities) {
    buf = await pipeline.jpeg({ quality: q, mozjpeg: false }).toBuffer();
    if (buf.length <= 300 * 1024) break;
  }
  // 最后兜底：再降一档 + 缩小
  if (buf.length > 300 * 1024) {
    buf = await sharp(buf)
      .resize({ width: 900, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toBuffer();
  }

  fs.writeFileSync(destPath, buf);
  return filename;
}

// ====== 路由 ======

/**
 * 上传头像（也走压缩）
 */
router.post('/avatar', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('请选择文件', 400);
    const filename = await compressAndSave(req.file.buffer, req.file.originalname);
    const url = `/uploads/${filename}`;

    const { User } = require('../models');
    await User.findByIdAndUpdate(req.userId, { avatarUrl: url });

    res.json({ success: true, message: '头像上传成功', data: { url } });
  } catch (e) {
    next(e);
  }
});

/**
 * 单图上传
 */
router.post('/image', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('请选择文件', 400);
    const filename = await compressAndSave(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      message: '图片上传成功',
      data: { url: `/uploads/${filename}` },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * 多图上传（≤9）
 */
router.post('/images', upload.array('files', 9), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('请选择文件', 400);
    }
    const urls = [];
    for (const f of req.files) {
      const fn = await compressAndSave(f.buffer, f.originalname);
      urls.push(`/uploads/${fn}`);
    }
    res.json({
      success: true,
      message: `成功上传 ${urls.length} 张图片`,
      data: { urls },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
