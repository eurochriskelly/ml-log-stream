-- =====================================================
-- Sample: Advanced Filtering
-- Description: Complex WHERE clause examples
-- Use case: Flexible log filtering techniques
-- =====================================================

-- Multiple condition search with regex-like patterns
SELECT 
    timestamp,
    level,
    app_server,
    message
FROM logs
WHERE (
    -- Search for specific error patterns
    message LIKE '%timeout%'
    OR message LIKE '%connection%failed%'
    OR message LIKE '%memory%'
    OR message LIKE '%disk%full%'
)
AND level IN ('ERROR', 'WARN', 'CRITICAL')
AND timestamp >= datetime('now', '-24 hours')
ORDER BY timestamp DESC;

-- Exclude noise patterns
SELECT 
    timestamp,
    level,
    app_server,
    uri,
    message
FROM logs
WHERE level IN ('ERROR', 'WARN', 'CRITICAL')
AND app_server NOT LIKE '%monitor%'
AND message NOT LIKE '%heartbeat%'
AND message NOT LIKE '%ping%'
AND timestamp >= datetime('now', '-1 hour')
ORDER BY timestamp DESC;

-- Find correlated events
SELECT 
    l1.timestamp,
    l1.app_server,
    l1.message as error_message,
    l2.message as preceding_message
FROM logs l1
JOIN logs l2 ON l1.app_server = l2.app_server
WHERE l1.level = 'ERROR'
AND l2.timestamp < l1.timestamp
AND l2.timestamp > datetime(l1.timestamp, '-5 minutes')
AND l2.level = 'INFO'
ORDER BY l1.timestamp DESC, l2.timestamp DESC
LIMIT 20;