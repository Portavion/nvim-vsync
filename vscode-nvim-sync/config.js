const vscode = require('vscode');

class Config {
    constructor() {
        this.config = vscode.workspace.getConfiguration('nvim-vsync');
    }

    get host() {
        return this.config.get('host', '127.0.0.1');
    }

    get port() {
        return this.config.get('port', 55666);
    }

    reload() {
        this.config = vscode.workspace.getConfiguration('nvim-vsync');
    }
}

module.exports = new Config();
