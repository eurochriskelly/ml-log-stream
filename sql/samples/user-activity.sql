-- =====================================================
-- Sample: User Activity
-- Description: Track user actions and authentication
-- Use case: Security auditing and usage analytics
-- =====================================================

-- Most active users
SELECT 
    user,
    COUNT(*) as request_count,
    COUNT(DISTINCT source) as servers_accessed,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity
FROM logs
WHERE user IS NOT NULL
GROUP BY user
ORDER BY request_count DESC
LIMIT 15;

-- Login/logout events
SELECT 
    timestamp,
    user,
    source,
    message
FROM logs
WHERE message LIKE '%login%' 
   OR message LIKE '%logout%'
   OR message LIKE '%authentication%'
   OR message LIKE '%session%'
ORDER BY timestamp DESC
LIMIT 30;

-- Failed authentication attempts
SELECT 
    timestamp,
    user,
    app_server,
    host,
    message
FROM logs
WHERE (message LIKE '%authentication failed%' 
    OR message LIKE '%login failed%'
    OR message LIKE '%unauthorized%'
    OR message LIKE '%access denied%')
ORDER BY timestamp DESC
LIMIT 20;