const vscode = require('vscode');

class StatusBarManager {
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'nvim-vsync.toggle';
    }

    show() {
        this.statusBarItem.show();
    }

    update(isEnabled, isConnected) {
        if (isEnabled) {
            if (isConnected) {
                this.statusBarItem.text = '$(sync) Nvim Sync: On';
                this.statusBarItem.tooltip = 'Click to disconnect';
            } else {
                this.statusBarItem.text = '$(sync) Nvim Sync: Connecting...';
                this.statusBarItem.tooltip = 'Click to disconnect';
            }
        } else {
            this.statusBarItem.text = '$(sync-ignored) Nvim Sync: Off';
            this.statusBarItem.tooltip = 'Click to connect';
        }
        this.show();
    }

    setMessage(message, timeout = 3000) {
        vscode.window.setStatusBarMessage(message, timeout);
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

module.exports = new StatusBarManager();
