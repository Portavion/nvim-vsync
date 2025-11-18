// sync-server.js
const net = require('net');

const clients = new Set();

const server = net.createServer((socket) => {
    console.log('Client connected');
    clients.add(socket);

    socket.on('data', (data) => {
        // Broadcast data to all other clients
        for (const client of clients) {
            if (client !== socket) {
                try {
                    client.write(data);
                } catch (err) {
                    console.error('Write error:', err);
                }
            }
        }
    });

    socket.on('close', () => {
        console.log('Client disconnected');
        clients.delete(socket);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
        clients.delete(socket);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Sync server running on port ${PORT}`);
});