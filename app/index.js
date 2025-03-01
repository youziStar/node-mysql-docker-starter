// 引入 mysql2 的 Promise 版本（支持 async/await 语法）
const mysql = require('mysql2/promise');
// 引入支持 Promise 的 setTimeout（用于实现延迟）
const { setTimeout } = require('timers/promises');

// 集中管理数据库配置（最佳实践：便于维护和修改）
const DB_CONFIG = {
  host: process.env.MYSQL_HOST,       // 从环境变量读取数据库地址
  user: process.env.MYSQL_USER,       // 数据库用户名
  password: process.env.MYSQL_PASSWORD, // 数据库密码
  database: process.env.MYSQL_DB,     // 要连接的数据库名称
  port: 3306,                        // MySQL 默认端口
  waitForConnections: true,          // 当无可用连接时等待（true）还是直接报错（false）
  connectionLimit: 10,               // 连接池最大连接数
  queueLimit: 0                      // 等待连接的最大队列数量（0表示无限制）
};

// 重试策略配置（指数退避算法参数）
const RETRY_STRATEGY = {
  maxAttempts: 5,      // 最大重试次数
  baseDelay: 2000,     // 基础延迟时间（单位：毫秒）
  backoffFactor: 1.5   // 退避因子（每次延迟时间倍增系数）
};

// 带指数退避的数据库连接方法
async function createConnectionWithRetry() {
  let attempt = 0;      // 当前尝试次数计数器
  let delay = RETRY_STRATEGY.baseDelay; // 动态延迟时间

  // 使用循环实现重试机制
  while (attempt < RETRY_STRATEGY.maxAttempts) {
    try {
      // 创建数据库连接池（提升性能，复用连接）
      const pool = mysql.createPool(DB_CONFIG);
      // 测试连接是否真正可用
      await testConnection(pool);
      // 成功提示（包含ISO格式时间戳）
      console.log('✅ [%s] 成功建立数据库连接', new Date().toISOString());
      return pool; // 返回可用的连接池对象
    } catch (err) {
      attempt++; // 增加尝试次数计数
      // 输出带错误代码的友好提示
      console.error(`⚠️  连接失败（尝试 ${attempt}/${RETRY_STRATEGY.maxAttempts}）: ${err.code || err.message}`);
      
      // 达到最大尝试次数时退出循环
      if (attempt === RETRY_STRATEGY.maxAttempts) break;
      
      // 计算下次延迟时间（指数退避算法）
      delay *= RETRY_STRATEGY.backoffFactor;
      // 转换为秒显示更友好
      console.log(`⏳ ${Math.round(delay/1000)}秒后重试...`);
      // 等待指定时间后继续循环
      await setTimeout(delay);
    }
  }
  // 所有尝试失败后抛出异常
  throw new Error(`数据库连接失败：超过最大重试次数（${RETRY_STRATEGY.maxAttempts}）`);
}

// 测试数据库连接有效性的方法
async function testConnection(pool) {
  // 从连接池获取一个连接
  const connection = await pool.getConnection();
  try {
    // 发送 ping 命令验证连接有效性
    await connection.ping();
    // 释放连接回连接池（重要！避免连接泄漏）
    connection.release();
  } catch (err) {
    // 即使出错也要释放连接
    connection.release();
    // 重新抛出错误供上层处理
    throw err;
  }
}

// 执行数据库事务操作的主方法
async function performDatabaseOperations(pool) {
  let connection; // 用于保存当前连接引用
  try {
    // 从连接池获取连接
    connection = await pool.getConnection();
    // 开启事务（保证后续操作的原子性）
    await connection.beginTransaction();

    // 示例查询：获取最新记录
    const [initialData] = await connection.query(
      'SELECT id, value, created_at FROM test_table ORDER BY created_at DESC LIMIT 1'
    );
    // 格式化输出查询结果
    logResults('初始查询结果', initialData);

    // 准备插入数据（包含时间戳保证唯一性）
    const testValue = `Docker测试@${new Date().toISOString()}`;
    // 使用参数化查询防止 SQL 注入
    const [insertResult] = await connection.execute(
      'INSERT INTO test_table (value) VALUES (?)',
      [testValue]
    );
    // 输出插入数据的自增ID
    console.log(`📥 插入数据成功，ID: ${insertResult.insertId}`);

    // 验证插入结果：查询刚插入的数据
    const [updatedData] = await connection.query(
      'SELECT id, value, created_at FROM test_table WHERE id = ?',
      [insertResult.insertId]
    );
    logResults('最新记录', updatedData);

    // 提交事务（只有所有操作成功才会真正写入）
    await connection.commit();
    return updatedData;
  } catch (err) {
    // 出错时回滚事务（撤销所有操作）
    if (connection) await connection.rollback();
    throw err;
  } finally {
    // 无论成功与否都释放连接
    if (connection) connection.release();
  }
}

// 格式化输出查询结果的工具函数
function logResults(title, results) {
  console.log(`\n📊 ${title}:`);
  // 使用 console.table 美化输出
  console.table(results.map(r => ({
    ID: r.id,
    Value: r.value,
    '创建时间': r.created_at.toISOString() // 转换时间为标准格式
  })));
}

// 主函数（程序入口）
async function main() {
  try {
    // 验证必需的环境变量
    const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DB'];
    requiredEnvVars.forEach(env => {
      if (!process.env[env]) throw new Error(`缺少必要环境变量: ${env}`);
    });

    // 创建带重试的连接池
    const pool = await createConnectionWithRetry();
    // 执行数据库操作
    const result = await performDatabaseOperations(pool);
    
    // 关闭连接池（重要！避免进程挂起）
    await pool.end();
    return result;
  } catch (err) {
    // 输出完整的错误堆栈信息
    console.error('\n❌ 严重错误:', err.stack || err.message);
    // 设置非零退出码（表示异常终止）
    process.exitCode = 1;
  } finally {
    // 无论成功失败都会执行的清理工作
    console.log('\n🏁 操作流程完成');
  }
}

// 启动程序
main()
  .then(() => console.log('✅ 服务正常启动'))
  .catch(() => process.exit(1)); // 确保任何未捕获错误都退出进程
  