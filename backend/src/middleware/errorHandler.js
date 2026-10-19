/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MySQL 重复键错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '数据已存在',
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token 无效',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token 已过期',
    });
  }

  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制',
    });
  }

  // 自定义业务错误
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }

  // body-parser JSON 解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: '请求体格式错误',
    });
  }

  // 允许暴露的错误（如 body-parser 的 entity.too.large 等）
  if (err.expose === true) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }

  // 默认 500
  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : err.message,
  });
};

module.exports = errorHandler;
