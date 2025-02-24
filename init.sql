/* 强化初始化脚本 */
USE mydb;

-- 清理旧数据（调试时使用）
DROP TABLE IF EXISTS test_table;

-- 创建带注释的表
CREATE TABLE test_table (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  value VARCHAR(255) NOT NULL COMMENT '测试值',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入初始化数据（可选）
INSERT INTO test_table (value) VALUES ('初始化数据');