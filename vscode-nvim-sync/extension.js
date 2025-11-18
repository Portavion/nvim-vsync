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
}

function deactivate() {}

module.exports = { activate, deactivate };