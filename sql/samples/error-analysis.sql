-- =====================================================
-- Sample: Error Analysis
-- Description: Find and analyze error messages in logs
-- Use case: Troubleshooting issues and identifying patterns
-- =====================================================

-- Count errors by type
SELECT 
    level,
    COUNT(*) as error_count
FROM logs
WHERE level IN ('ERROR', 'CRITICAL', 'SEVERE')
GROUP BY level
ORDER BY error_count DESC;

-- Get recent errors with context
SELECT 
    timestamp,
    level,
    message,
    app_server,
    host
FROM logs
WHERE level IN ('ERROR', 'CRITICAL', 'SEVERE')
ORDER BY timestamp DESC
LIMIT 20;

-- Find most frequent error messages
SELECT 
    message,
    COUNT(*) as occurrence_count,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen
FROM logs
WHERE level = 'ERROR'
GROUP BY message
HAVING occurrence_count > 1
ORDER BY occurrence_count DESC
LIMIT 10;