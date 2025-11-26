const wsProtocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
const ws = new WebSocket(wsProtocol + '//' + location.host);

ws.onopen = () => {
    console.log('Connecté au serveur WebSocket');
};

function sendCommand(cmd) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'command', cmd }));
    } else {
        console.warn('WebSocket non ouvert, impossible d\'envoyer', cmd);
    }
}
