# nvim-vsync

A Neovim plugin that syncs file navigation between Neovim instances and VS Code through a local server.

## Features

- Sync file opening between multiple Neovim instances
- Integration with VS Code via extension
- Real-time bidirectional synchronization

## Installation

### Prerequisites

- Neovim 0.5+
- Node.js (for the sync server)

### Using lazy.nvim

Add this to your Neovim configuration:

```lua
{
  'portavion/nvim-vsync',
  config = function()
    -- Plugin auto-loads via plugin/nvim-vsync.lua
    -- No additional configuration needed
  end,
}
```

### Using packer.nvim

```lua
use 'portavion/nvim-vsync'
```

### Using vim-plug

```vim
Plug 'portavion/nvim-vsync'
```

## Setup

1. **Start the sync server:**

```bash
node sync-server.js
```

The server will run on port 3000 by default.

2. **Open Neovim** - The plugin will automatically connect to the sync server.

3. **Optional: Install VS Code extension** - Located in `vscode-nvim-sync/` directory.

## How it Works

- When you open a file in Neovim, it sends the file path to the sync server
- The sync server broadcasts this to all connected clients (other Neovim instances or VS Code)
- Connected clients automatically open the same file

## Configuration

Currently, the plugin connects to `127.0.0.1:3000` by default. To customize:

```lua
-- In your Neovim config, before the plugin loads
vim.g.nvim_vsync_host = '127.0.0.1'
vim.g.nvim_vsync_port = 3000
```

## Troubleshooting

- **Connection errors**: Make sure the sync server is running (`node sync-server.js`)
- **Files not syncing**: Check that the file paths are absolute and accessible
- **Port conflicts**: Change the port in both `sync-server.js` and your Neovim config

## License
