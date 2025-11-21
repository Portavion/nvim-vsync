const vscode = require('vscode');

class EventHandler {
    constructor(syncClient) {
        this.syncClient = syncClient;
        this.isRemoteUpdate = false;
        this.debounceTimer = null;
    }

    setRemoteUpdate(value) {
        this.isRemoteUpdate = value;
    }

    register(context) {
        // Active Text Editor Changed
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (this.syncClient.isEnabled && editor && !this.isRemoteUpdate) {
                const filePath = editor.document.uri.fsPath;
                if (editor.document.uri.scheme === 'file') {
                    this.syncClient.sendOpenFile(filePath);
                }
            }
        }, null, context.subscriptions);

        // Text Document Closed
        vscode.workspace.onDidCloseTextDocument(doc => {
            if (this.syncClient.isEnabled && !this.isRemoteUpdate && doc.uri.scheme === 'file') {
                this.syncClient.sendCloseFile(doc.uri.fsPath);
            }
        }, null, context.subscriptions);

        // Text Editor Selection Changed (Cursor Move)
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (this.syncClient.isEnabled && event.textEditor && !this.isRemoteUpdate && event.textEditor.document.uri.scheme === 'file') {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    const position = event.selections[0].active;
                    this.syncClient.sendCursorMove(
                        event.textEditor.document.uri.fsPath,
                        position.line,
                        position.character
                    );
                }, 50);
            }
        }, null, context.subscriptions);

        // Handle incoming messages
        this.syncClient.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });
    }

    async handleIncomingMessage(message) {
        try {
            if (message.type === 'openFile' && message.path) {
                this.setRemoteUpdate(true);
                const doc = await vscode.workspace.openTextDocument(message.path);
                await vscode.window.showTextDocument(doc);
                setTimeout(() => { this.setRemoteUpdate(false); }, 100);
            } else if (message.type === 'closeFile' && message.path) {
                this.setRemoteUpdate(true);
                const targetPath = message.path;
                for (const group of vscode.window.tabGroups.all) {
                    for (const tab of group.tabs) {
                        if (tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath === targetPath) {
                            await vscode.window.tabGroups.close(tab);
                        }
                    }
                }
                setTimeout(() => { this.setRemoteUpdate(false); }, 100);
            } else if (message.type === 'cursorMove' && message.path) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath === message.path) {
                    this.setRemoteUpdate(true);
                    const position = new vscode.Position(message.line, message.character);
                    const selection = new vscode.Selection(position, position);
                    activeEditor.selection = selection;
                    activeEditor.revealRange(new vscode.Range(position, position));
                    setTimeout(() => { this.setRemoteUpdate(false); }, 50);
                }
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    }
}

module.exports = EventHandler;
