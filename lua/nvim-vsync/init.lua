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
                if success then
                    if decoded.type == 'openFile' and decoded.path then
                        local current_file = vim.fn.expand('%:p')
                        
                        -- If we are already editing this file, do nothing
                        if current_file ~= decoded.path then
                            is_remote_update = true
                            -- 'drop' is better than 'edit' as it switches to open window if available
                            vim.cmd('drop ' .. vim.fn.fnameescape(decoded.path))
                            -- Reset flag after a brief moment to allow autocmds to settle
                            vim.defer_fn(function() is_remote_update = false end, 100)
                        end
                    elseif decoded.type == 'closeFile' and decoded.path then
                        local target_path = decoded.path
                        local bufnr = vim.fn.bufnr(target_path)
                        
                        -- Fallback: try to match by iterating buffers if exact match failed
                        if bufnr == -1 then
                            for _, b in ipairs(vim.api.nvim_list_bufs()) do
                                local b_name = vim.api.nvim_buf_get_name(b)
                                if b_name == target_path then
                                    bufnr = b
                                    break
                                end
                            end
                        end

                        if bufnr ~= -1 and vim.api.nvim_buf_is_valid(bufnr) then
                            is_remote_update = true
                            -- Delete the buffer safely
                            pcall(vim.cmd, 'bdelete ' .. bufnr)
                            vim.defer_fn(function() is_remote_update = false end, 100)
                        end
                    elseif decoded.type == 'cursorMove' and decoded.path then
                        local current_file = vim.fn.expand('%:p')
                        if current_file == decoded.path then
                            is_remote_update = true
                            -- VS Code is 0-based line, Neovim is 1-based
                            local line = decoded.line + 1
                            local col = decoded.character
                            pcall(vim.api.nvim_win_set_cursor, 0, {line, col})
                            vim.defer_fn(function() is_remote_update = false end, 50)
                        end
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

-- Autocommand to send file path on buffer delete (close)
vim.api.nvim_create_autocmd("BufDelete", {
    pattern = "*",
    callback = function()
        if is_remote_update then return end
        
        local filepath = vim.fn.expand("<afile>:p")
        -- Only sync if it's a real file
        if filepath ~= "" and client then
            local payload = vim.json.encode({ type = 'closeFile', path = filepath })
            client:write(payload)
        end
    end
})

-- Autocommand to send cursor position
vim.api.nvim_create_autocmd({"CursorMoved", "CursorMovedI"}, {
    pattern = "*",
    callback = function()
        if is_remote_update then return end
        
        local filepath = vim.fn.expand("%:p")
        if filepath ~= "" and vim.bo.buftype == "" and client then
            local cursor = vim.api.nvim_win_get_cursor(0)
            -- Neovim is 1-based line, VS Code is 0-based
            local line = cursor[1] - 1
            local col = cursor[2]
            
            local payload = vim.json.encode({
                type = 'cursorMove',
                path = filepath,
                line = line,
                character = col
            })
            client:write(payload)
        end
    end
})