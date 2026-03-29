-- =====================================================
-- Sample: Error Analysis
-- Description: Find and analyze error messages in logs
-- Use case: Troubleshooting issues and identifying patterns
-- =====================================================

-- Count errors by type
SELECT 
    type,
    COUNT(*) as error_count
FROM logs
WHERE type IN ('ERROR', 'CRITICAL', 'SEVERE')
GROUP BY type
ORDER BY error_count DESC;

-- Get recent errors with context
SELECT 
    timestamp,
    type,
    message,
    source,
    host
FROM logs
WHERE type IN ('ERROR', 'CRITICAL', 'SEVERE')
ORDER BY timestamp DESC
LIMIT 20;

-- Find most frequent error messages
SELECT 
    message,
    COUNT(*) as occurrence_count,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen
FROM logs
WHERE type = 'ERROR'
GROUP BY message
HAVING occurrence_count > 1
ORDER BY occurrence_count DESC
LIMIT 10;