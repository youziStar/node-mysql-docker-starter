const mysql = require('mysql2/promise');
const { setTimeout } = require('timers/promises');

// 配置常量集中管理
const DB_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const RETRY_STRATEGY = {
  maxAttempts: 5,
  baseDelay: 2000,
  backoffFactor: 1.5
};

// 带指数退避的重试连接
async function createConnectionWithRetry() {
  let attempt = 0;
  let delay = RETRY_STRATEGY.baseDelay;

  while (attempt < RETRY_STRATEGY.maxAttempts) {
    try {
      const pool = mysql.createPool(DB_CONFIG);
      await testConnection(pool);
      console.log('✅ [%s] 成功建立数据库连接', new Date().toISOString());
      return pool;
    } catch (err) {
      attempt++;
      console.error(`⚠️  连接失败（尝试 ${attempt}/${RETRY_STRATEGY.maxAttempts}）: ${err.code || err.message}`);
      
      if (attempt === RETRY_STRATEGY.maxAttempts) break;
      
      delay *= RETRY_STRATEGY.backoffFactor;
      console.log(`⏳ ${Math.round(delay/1000)}秒后重试...`);
      await setTimeout(delay);
    }
  }
  throw new Error(`数据库连接失败：超过最大重试次数（${RETRY_STRATEGY.maxAttempts}）`);
}

async function testConnection(pool) {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    connection.release();
  } catch (err) {
    connection.release();
    throw err;
  }
}

// 带事务的数据库操作
async function performDatabaseOperations(pool) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 查询测试
    const [initialData] = await connection.query(
      'SELECT id, value, created_at FROM test_table ORDER BY created_at DESC LIMIT 1'
    );
    logResults('初始查询结果', initialData);

    // 插入数据
    const testValue = `Docker测试@${new Date().toISOString()}`;
    const [insertResult] = await connection.execute(
      'INSERT INTO test_table (value) VALUES (?)',
      [testValue]
    );
    console.log(`📥 插入数据成功，ID: ${insertResult.insertId}`);

    // 验证插入
    const [updatedData] = await connection.query(
      'SELECT id, value, created_at FROM test_table WHERE id = ?',
      [insertResult.insertId]
    );
    logResults('最新记录', updatedData);

    await connection.commit();
    return updatedData;
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

function logResults(title, results) {
  console.log(`\n📊 ${title}:`);
  console.table(results.map(r => ({
    ID: r.id,
    Value: r.value,
    '创建时间': r.created_at.toISOString()
  })));
}

async function main() {
  try {
    // 环境变量验证
    const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DB'];
    requiredEnvVars.forEach(env => {
      if (!process.env[env]) throw new Error(`缺少必要环境变量: ${env}`);
    });

    const pool = await createConnectionWithRetry();
    const result = await performDatabaseOperations(pool);
    
    await pool.end();
    return result;
  } catch (err) {
    console.error('\n❌ 严重错误:', err.stack || err.message);
    process.exitCode = 1;
  } finally {
    console.log('\n🏁 操作流程完成');
  }
}

// 启动应用
main()
  .then(() => console.log('✅ 服务正常启动'))
  .catch(() => process.exit(1));