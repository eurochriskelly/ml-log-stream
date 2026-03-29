-- =====================================================
-- Sample: Performance Overview
-- Description: Analyze response times and slow queries
-- Use case: Performance tuning and bottleneck identification
-- =====================================================

-- Request count by source server
SELECT 
    source,
    COUNT(*) as request_count
FROM logs
WHERE source IS NOT NULL
GROUP BY source
ORDER BY request_count DESC;

-- Recent requests with URL
SELECT 
    timestamp,
    source,
    url,
    user
FROM logs
WHERE url IS NOT NULL
ORDER BY timestamp DESC
LIMIT 20;

-- Request volume by port
SELECT 
    port,
    COUNT(*) as request_count
FROM logs
WHERE port IS NOT NULL
GROUP BY port
ORDER BY request_count DESC;