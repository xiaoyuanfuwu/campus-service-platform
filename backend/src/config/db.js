const mysql = require('mysql2/promise');

let pool = null;

const getPool = () => {
  if (!pool) {
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE) {
      console.error('❌ 缺少 MySQL 环境变量配置 (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)');
      process.exit(1);
    }
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 50,
      charset: 'utf8mb4',
      timezone: '+08:00',
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // 仅在首次创建连接池时测试连接
    pool.getConnection()
      .then(conn => {
        console.log('✅ MySQL 已连接 (连接池上限: 20)');
        conn.release();
      })
      .catch(err => {
        console.error('❌ MySQL 连接失败:', err.message);
      });
  }

  return pool;
};

module.exports = getPool;
