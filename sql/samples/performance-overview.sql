-- =====================================================
-- Sample: Performance Overview
-- Description: Analyze response times and slow queries
-- Use case: Performance tuning and bottleneck identification
-- =====================================================

-- Average response time by app server
SELECT 
    app_server,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    MAX(response_time_ms) as max_response_time,
    MIN(response_time_ms) as min_response_time
FROM logs
WHERE response_time_ms IS NOT NULL
GROUP BY app_server
ORDER BY avg_response_time DESC;

-- Find slowest requests
SELECT 
    timestamp,
    app_server,
    uri,
    response_time_ms,
    user
FROM logs
WHERE response_time_ms IS NOT NULL
ORDER BY response_time_ms DESC
LIMIT 20;

-- Response time distribution
SELECT 
    CASE 
        WHEN response_time_ms < 100 THEN '0-100ms'
        WHEN response_time_ms < 500 THEN '100-500ms'
        WHEN response_time_ms < 1000 THEN '500ms-1s'
        WHEN response_time_ms < 5000 THEN '1-5s'
        ELSE '>5s'
    END as time_range,
    COUNT(*) as request_count
FROM logs
WHERE response_time_ms IS NOT NULL
GROUP BY time_range
ORDER BY MIN(response_time_ms);