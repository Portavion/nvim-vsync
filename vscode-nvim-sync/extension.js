const vscode = require('vscode');
const net = require('net');

function activate(context) {
    let client = null;
    let isRemoteUpdate = false;
    let isEnabled = false;
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'nvim-vsync.toggle';
    context.subscriptions.push(statusBarItem);

    function updateStatusBar() {
        if (isEnabled) {
            statusBarItem.text = '$(sync) Nvim Sync: On';
            statusBarItem.tooltip = 'Click to disconnect';
            statusBarItem.show();
        } else {
            statusBarItem.text = '$(sync-ignored) Nvim Sync: Off';
            statusBarItem.tooltip = 'Click to connect';
            statusBarItem.show();
        }
    }

    function connect() {
        if (client) { return; }
        client = new net.Socket();

        client.connect(3000, '127.0.0.1', () => {
            console.log('Connected to Sync Server');
            vscode.window.setStatusBarMessage('Nvim Sync: Connected', 3000);
        });

        client.on('error', (err) => {
            console.log('Connection error:', err.message);
            // If enabled, try to reconnect
            if (isEnabled) {
                setTimeout(connect, 5000);
            }
        });

        client.on('close', () => {
            console.log('Connection closed');
            client = null;
            if (isEnabled) {
                // Unexpected close, try to reconnect
                setTimeout(connect, 5000);
            }
        });

        // Listen for incoming data
        client.on('data', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === 'openFile' && message.path) {
                    isRemoteUpdate = true;
                    const doc = await vscode.workspace.openTextDocument(message.path);
                    await vscode.window.showTextDocument(doc);
                    setTimeout(() => { isRemoteUpdate = false; }, 100);
                } else if (message.type === 'closeFile' && message.path) {
                    isRemoteUpdate = true;
                    const targetPath = message.path;
                    for (const group of vscode.window.tabGroups.all) {
                        for (const tab of group.tabs) {
                            if (tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath === targetPath) {
                                await vscode.window.tabGroups.close(tab);
                            }
                        }
                    }
                    setTimeout(() => { isRemoteUpdate = false; }, 100);
                } else if (message.type === 'cursorMove' && message.path) {
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.uri.fsPath === message.path) {
                        isRemoteUpdate = true;
                        const position = new vscode.Position(message.line, message.character);
                        const selection = new vscode.Selection(position, position);
                        activeEditor.selection = selection;
                        activeEditor.revealRange(new vscode.Range(position, position));
                        setTimeout(() => { isRemoteUpdate = false; }, 50);
                    }
                }
            } catch (e) {
                console.error('Failed to parse incoming data', e);
            }
        });
    }

    function disconnect() {
        if (client) {
            client.destroy();
            client = null;
        }
    }

    function toggleSync() {
        isEnabled = !isEnabled;
        updateStatusBar();
        if (isEnabled) {
            connect();
        } else {
            disconnect();
        }
    }

    // Register command
    let disposable = vscode.commands.registerCommand('nvim-vsync.toggle', toggleSync);
    context.subscriptions.push(disposable);

    // Initialize (start as off by default, or on if you prefer)
    // Let's start as OFF to respect the user's "toggle" request implying control
    updateStatusBar();

    // --- Event Listeners (only active if isEnabled and client exists) ---

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (isEnabled && client && editor && !isRemoteUpdate) {
            const filePath = editor.document.uri.fsPath;
            if (editor.document.uri.scheme === 'file') {
                const payload = JSON.stringify({ type: 'openFile', path: filePath });
                // Check if writable
                if (!client.destroyed) client.write(payload);
            }
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidCloseTextDocument(doc => {
        if (isEnabled && client && !isRemoteUpdate && doc.uri.scheme === 'file') {
            const payload = JSON.stringify({ type: 'closeFile', path: doc.uri.fsPath });
            if (!client.destroyed) client.write(payload);
        }
    }, null, context.subscriptions);

    let debounceTimer;
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (isEnabled && client && event.textEditor && !isRemoteUpdate && event.textEditor.document.uri.scheme === 'file') {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const position = event.selections[0].active;
                const payload = JSON.stringify({
                    type: 'cursorMove',
                    path: event.textEditor.document.uri.fsPath,
                    line: position.line,
                    character: position.character
                });
                if (!client.destroyed) client.write(payload);
            }, 50);
        }
    }, null, context.subscriptions);
}

function deactivate() { }

module.exports = { activate, deactivate };