-- =====================================================
-- Sample: Request Patterns
-- Description: Analyze HTTP requests and endpoints
-- Use case: Understanding traffic patterns and popular endpoints
-- =====================================================

-- Most frequently accessed URIs
SELECT 
    uri,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time
FROM logs
WHERE uri IS NOT NULL
GROUP BY uri
ORDER BY request_count DESC
LIMIT 15;

-- HTTP methods distribution
SELECT 
    http_method,
    COUNT(*) as request_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM logs
WHERE http_method IS NOT NULL
GROUP BY http_method
ORDER BY request_count DESC;

-- Status code analysis
SELECT 
    status_code,
    COUNT(*) as request_count,
    CASE 
        WHEN status_code BETWEEN 200 AND 299 THEN 'Success'
        WHEN status_code BETWEEN 300 AND 399 THEN 'Redirect'
        WHEN status_code BETWEEN 400 AND 499 THEN 'Client Error'
        WHEN status_code BETWEEN 500 AND 599 THEN 'Server Error'
        ELSE 'Other'
    END as category
FROM logs
WHERE status_code IS NOT NULL
GROUP BY status_code
ORDER BY status_code;