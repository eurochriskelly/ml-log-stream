-- =====================================================
-- Sample: Request Patterns
-- Description: Analyze HTTP requests and endpoints
-- Use case: Understanding traffic patterns and popular endpoints
-- =====================================================

-- Most frequently accessed endpoints (by path parts)
SELECT 
    pathPart1 || '/' || pathPart2 as endpoint,
    COUNT(*) as request_count,
    ROUND(AVG(elapsedTime), 2) as avg_elapsed_time
FROM requests
WHERE pathPart1 IS NOT NULL
GROUP BY pathPart1, pathPart2
ORDER BY request_count DESC
LIMIT 15;

-- Top level paths distribution
SELECT 
    pathPart1,
    COUNT(*) as request_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM requests
WHERE pathPart1 IS NOT NULL
GROUP BY pathPart1
ORDER BY request_count DESC;

-- Slowest endpoints
SELECT 
    pathPart1 || '/' || pathPart2 as endpoint,
    COUNT(*) as request_count,
    ROUND(AVG(elapsedTime), 2) as avg_elapsed_time,
    ROUND(MAX(elapsedTime), 2) as max_elapsed_time
FROM requests
WHERE pathPart1 IS NOT NULL
GROUP BY pathPart1, pathPart2
ORDER BY avg_elapsed_time DESC
LIMIT 15;
