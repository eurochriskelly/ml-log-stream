-- =====================================================
-- Sample: Time-Based Analysis
-- Description: Analyze log patterns over time
-- Use case: Identifying peak usage periods and trends
-- =====================================================

-- Hourly log volume
SELECT 
    strftime('%Y-%m-%d %H:00', timestamp) as hour,
    COUNT(*) as log_count,
    COUNT(DISTINCT app_server) as active_servers
FROM logs
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;

-- Daily summary for the past week
SELECT 
    strftime('%Y-%m-%d', timestamp) as date,
    COUNT(*) as total_logs,
    SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as error_count,
    SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) as warning_count,
    AVG(response_time_ms) as avg_response_time
FROM logs
WHERE timestamp >= datetime('now', '-7 days')
GROUP BY date
ORDER BY date DESC;

-- Peak traffic hours (all time)
SELECT 
    strftime('%H', timestamp) as hour_of_day,
    COUNT(*) as request_count,
    ROUND(AVG(response_time_ms), 2) as avg_response_time
FROM logs
GROUP BY hour_of_day
ORDER BY request_count DESC;