-- =====================================================
-- Sample: Database Operations
-- Description: Monitor database and index operations
-- Use case: Database health and optimization
-- =====================================================

-- Database operations by type
SELECT 
    CASE 
        WHEN message LIKE '%insert%' THEN 'INSERT'
        WHEN message LIKE '%update%' THEN 'UPDATE'
        WHEN message LIKE '%delete%' THEN 'DELETE'
        WHEN message LIKE '%query%' THEN 'QUERY'
        WHEN message LIKE '%index%' THEN 'INDEX'
        WHEN message LIKE '%merge%' THEN 'MERGE'
        ELSE 'OTHER'
    END as operation_type,
    COUNT(*) as operation_count
FROM logs
WHERE message LIKE '%insert%' 
   OR message LIKE '%update%'
   OR message LIKE '%delete%'
   OR message LIKE '%query%'
   OR message LIKE '%index%'
   OR message LIKE '%merge%'
GROUP BY operation_type
ORDER BY operation_count DESC;

-- Slow database operations
SELECT 
    timestamp,
    app_server,
    message,
    response_time_ms
FROM logs
WHERE (message LIKE '%query%' OR message LIKE '%index%')
  AND response_time_ms > 1000
ORDER BY response_time_ms DESC
LIMIT 15;

-- Forest and database events
SELECT 
    timestamp,
    level,
    app_server,
    message
FROM logs
WHERE message LIKE '%forest%'
   OR message LIKE '%database%'
   OR message LIKE '%stand%'
   OR message LIKE '%merge%'
ORDER BY timestamp DESC
LIMIT 25;