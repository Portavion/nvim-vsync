const vscode = require('vscode');
const config = require('./config');
const syncClient = require('./sync-client');
const statusBar = require('./status-bar');
const EventHandler = require('./event-handler');

function activate(context) {
    const eventHandler = new EventHandler(syncClient);
    eventHandler.register(context);

    // Status Bar Logic
    statusBar.show();
    syncClient.on('connected', () => {
        statusBar.update(true, true);
        statusBar.setMessage('Nvim Sync: Connected');
    });
    syncClient.on('disconnected', () => {
        statusBar.update(syncClient.isEnabled, false);
    });
    syncClient.on('error', (err) => {
        console.log('Connection error:', err.message);
        statusBar.update(syncClient.isEnabled, false);
    });

    // Command Registration
    let disposable = vscode.commands.registerCommand('nvim-vsync.toggle', () => {
        if (syncClient.isEnabled) {
            syncClient.disconnect();
            statusBar.update(false, false);
        } else {
            config.reload(); // Reload config on connect
            syncClient.connect();
            statusBar.update(true, false);
        }
    });
    context.subscriptions.push(disposable);

    // Initial State
    statusBar.update(false, false);
}

function deactivate() {
    syncClient.disconnect();
    statusBar.dispose();
}

module.exports = { activate, deactivate };