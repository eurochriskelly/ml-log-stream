-- =====================================================
-- Sample: Advanced Filtering
-- Description: Complex WHERE clause examples
-- Use case: Flexible log filtering techniques
-- =====================================================

-- Multiple condition search with regex-like patterns
SELECT 
    timestamp,
    type,
    source,
    message
FROM logs
WHERE (
    -- Search for specific error patterns
    message LIKE '%timeout%'
    OR message LIKE '%connection%failed%'
    OR message LIKE '%memory%'
    OR message LIKE '%disk%full%'
)
AND type IN ('ERROR', 'WARN', 'CRITICAL')
AND timestamp >= datetime('now', '-24 hours')
ORDER BY timestamp DESC;

-- Exclude noise patterns
SELECT 
    timestamp,
    type,
    source,
    url,
    message
FROM logs
WHERE type IN ('ERROR', 'WARN', 'CRITICAL')
AND source NOT LIKE '%monitor%'
AND message NOT LIKE '%heartbeat%'
AND message NOT LIKE '%ping%'
AND timestamp >= datetime('now', '-1 hour')
ORDER BY timestamp DESC;

-- Find correlated events
SELECT 
    l1.timestamp,
    l1.source,
    l1.message as error_message,
    l2.message as preceding_message
FROM logs l1
JOIN logs l2 ON l1.source = l2.source
WHERE l1.type = 'ERROR'
AND l2.timestamp < l1.timestamp
AND l2.timestamp > datetime(l1.timestamp, '-5 minutes')
AND l2.type = 'INFO'
ORDER BY l1.timestamp DESC, l2.timestamp DESC
LIMIT 20;