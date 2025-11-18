const vscode = require('vscode');
const net = require('net');

function activate(context) {
    const client = new net.Socket();
    let isRemoteUpdate = false; // Flag to prevent infinite loops

    // 1. Connect to the Relay Server
    function connect() {
        client.connect(3000, '127.0.0.1', () => {
            console.log('Connected to Sync Server');
        });
    }

    connect();

    client.on('error', (err) => {
        console.log('Connection error, retrying in 5s...', err.message);
        setTimeout(connect, 5000);
    });

    // 2. Listen for incoming file paths
    client.on('data', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'openFile' && message.path) {
                // Prevent triggering our own event listener
                isRemoteUpdate = true;

                const doc = await vscode.workspace.openTextDocument(message.path);
                await vscode.window.showTextDocument(doc);

                // Reset flag after short delay
                setTimeout(() => { isRemoteUpdate = false; }, 100);
            } else if (message.type === 'closeFile' && message.path) {
                isRemoteUpdate = true;

                // Find and close the tab(s) matching the file path
                const targetPath = message.path;
                // Using TabGroups API (VS Code 1.67+)
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

    // 3. Send active file path when user switches tabs
    let activeEditor = vscode.window.activeTextEditor;

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && !isRemoteUpdate) {
            const filePath = editor.document.uri.fsPath;
            // Only sync real files (ignore "Untitled-1", "output:", etc.)
            if (editor.document.uri.scheme === 'file') {
                const payload = JSON.stringify({ type: 'openFile', path: filePath });
                client.write(payload);
            }
        }
    }, null, context.subscriptions);

    // 4. Listen for file closing
    vscode.workspace.onDidCloseTextDocument(doc => {
        if (!isRemoteUpdate && doc.uri.scheme === 'file') {
            const payload = JSON.stringify({ type: 'closeFile', path: doc.uri.fsPath });
            client.write(payload);
        }
    }, null, context.subscriptions);

    // 5. Listen for cursor movement
    let debounceTimer;
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor && !isRemoteUpdate && event.textEditor.document.uri.scheme === 'file') {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const position = event.selections[0].active;
                const payload = JSON.stringify({
                    type: 'cursorMove',
                    path: event.textEditor.document.uri.fsPath,
                    line: position.line,
                    character: position.character
                });
                client.write(payload);
            }, 50);
        }
    }, null, context.subscriptions);
}

function deactivate() { }

module.exports = { activate, deactivate };