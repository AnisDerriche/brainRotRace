const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  let requestPath = req.url.split('?')[0];
  if (requestPath === '/' || requestPath === '') requestPath = '/game.html';

  const safePath = path.normalize(requestPath).replace(/^\.+/, '');
  const fullPath = path.join(__dirname, safePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

console.log('Démarrage du serveur HTTP+WebSocket...');

let clients = [];

wss.on('connection', function connection(ws, req) {
  const remoteAddr = req && req.socket && req.socket.remoteAddress;
  console.log('Client WS connecté', remoteAddr || 'adresse inconnue');

  clients.push(ws);

  ws.on('message', function incoming(message) {
    console.log('Message reçu : %s', message);

    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('Client WS déconnecté');
  });
});

wss.on('error', (err) => {
  console.error('Erreur WebSocket server:', err && err.message ? err.message : err);
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  const displayHost = (addr && (addr.address === '::' || addr.address === '0.0.0.0')) ? '0.0.0.0' : (addr && addr.address) || HOST;
  console.log(`Server listening on http://${displayHost}:${addr.port}`);
});

