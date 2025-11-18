-- lua/sync_plugin.lua
local uv = vim.loop -- Use vim.uv on Neovim 0.10+
local client = nil
local is_remote_update = false

local function connect()
    client = uv.new_tcp()
    client:connect("127.0.0.1", 3000, function(err)
        if err then
            print("Sync Error: " .. err)
            return
        end
        
        -- Read incoming data
        client:read_start(function(err, chunk)
            if err or not chunk then return end
            
            -- Schedule the buffer change on the main UI thread
            vim.schedule(function()
                local success, decoded = pcall(vim.json.decode, chunk)
                if success and decoded.type == 'openFile' and decoded.path then
                    local current_file = vim.fn.expand('%:p')
                    
                    -- If we are already editing this file, do nothing
                    if current_file ~= decoded.path then
                        is_remote_update = true
                        -- 'drop' is better than 'edit' as it switches to open window if available
                        vim.cmd('drop ' .. vim.fn.fnameescape(decoded.path))
                        -- Reset flag after a brief moment to allow autocmds to settle
                        vim.defer_fn(function() is_remote_update = false end, 100)
                    end
                end
            end)
        end)
    end)
end

-- Initialize connection
connect()

-- Autocommand to send file path on buffer enter
vim.api.nvim_create_autocmd("BufEnter", {
    pattern = "*",
    callback = function()
        if is_remote_update then return end
        
        local filepath = vim.fn.expand("%:p")
        -- Only sync if it's a real file (not empty or special buffer)
        if filepath ~= "" and vim.bo.buftype == "" and client then
            local payload = vim.json.encode({ type = 'openFile', path = filepath })
            -- Write to socket
            client:write(payload)
        end
    end
})