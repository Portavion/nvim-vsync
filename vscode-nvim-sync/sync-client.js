const net = require('net');
const EventEmitter = require('events');
const config = require('./config');

class SyncClient extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.retryTimer = null;
        this.isEnabled = false;
    }

    connect() {
        if (this.client) return;
        this.isEnabled = true; // Mark as enabled when we try to connect

        this.client = new net.Socket();

        this.client.connect(config.port, config.host, () => {
            this.emit('connected');
        });

        this.client.on('error', (err) => {
            this.emit('error', err);
            this.reconnect();
        });

        this.client.on('close', () => {
            this.emit('disconnected');
            this.client = null;
            this.reconnect();
        });

        this.client.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.emit('message', message);
            } catch (e) {
                console.error('Failed to parse incoming data', e);
            }
        });
    }

    reconnect() {
        if (this.isEnabled && !this.client) {
            clearTimeout(this.retryTimer);
            this.retryTimer = setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    disconnect() {
        this.isEnabled = false;
        clearTimeout(this.retryTimer);
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
    }

    send(data) {
        if (this.client && !this.client.destroyed) {
            this.client.write(JSON.stringify(data));
        }
    }

    sendOpenFile(path) {
        this.send({ type: 'openFile', path });
    }

    sendCloseFile(path) {
        this.send({ type: 'closeFile', path });
    }

    sendCursorMove(path, line, character) {
        this.send({ type: 'cursorMove', path, line, character });
    }
}

module.exports = new SyncClient();
