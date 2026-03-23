-- remove_prefix
function remove_prefix(tag, timestamp, record)
    local msg = record["Message"] -- Adjust the key if needed
    if msg then
        -- Initialize an empty table to store cleaned lines
        local lines = {}
        -- Iterate over each line in the message
        for line in msg:gmatch("[^\n]+") do
            -- Remove timestamp and prefix from each line
            local cleaned_line = line:gsub("^%d%d%d%d%-%d%d%-%d%d %d%d:%d%d:%d%d%.%d%d%d %w+:?%+?%s*", "")
            table.insert(lines, cleaned_line)
        end
        -- Join all cleaned lines with newline as separator
        record["Message"] = table.concat(lines, "\n")
    end
    return 1, timestamp, record
end


