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
    require('nvim-vsync').setup({})
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

The server will run on port 55666 by default.

2. **Open Neovim**
   The plugin is installed but disabled by default. To enable synchronization, run the command:
   ```vim
   :VSync
   ```

3. **Open VS Code**
   Install the extension from the `vscode-nvim-sync/` directory.
   To enable synchronization, open the Command Palette (Cmd+Shift+P) and run:
   `Nvim Sync: Toggle Nvim Sync`
   
   Alternatively, click the "Nvim Sync" item in the status bar.

## How it Works

- When you open a file in Neovim, it sends the file path to the sync server
- The sync server broadcasts this to all connected clients (other Neovim instances or VS Code)
- Connected clients automatically open the same file

## Configuration

The default port is `55666`. You can configure the host and port as follows:

### Neovim

Pass options to the setup function:

```lua
require('nvim-vsync').setup({
    host = "127.0.0.1",
    port = 55666 -- Custom port
})
```

### VS Code

Go to Settings and search for `nvim-vsync`, or edit `settings.json`:

```json
{
    "nvim-vsync.host": "127.0.0.1",
    "nvim-vsync.port": 55666
}
```

### Sync Server

You can set the port using an environment variable or command line argument:

```bash
# Using environment variable
VSYNC_PORT=55666 node sync-server.js
```

## Troubleshooting

- **Connection errors**: Make sure the sync server is running (`node sync-server.js`)
- **Files not syncing**: Check that the file paths are absolute and accessible
- **Port conflicts**: Change the port in both `sync-server.js` and your Neovim config

## License
