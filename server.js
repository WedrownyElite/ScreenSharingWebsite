// server.js
const express = require('express');
const app = express();
const server = require('https').createServer({
   key: require('fs').readFileSync('server.key'),
   cert: require('fs').readFileSync('server.cert')
}, app);
const io = require('socket.io')(server);
const path = require('path');
const os = require('os');

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
   res.render('index');
});

function getLocalIpAddress() {
  const ifaces = os.networkInterfaces();
  let ipAddress;

  Object.keys(ifaces).forEach((ifname) => {
    ifaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
}

// Use the local IP address or 'localhost'
const localIpAddress = getLocalIpAddress() || 'localhost';

function emitUserChanges(socket, sessionCode) {
   const room = io.sockets.adapter.rooms.get(sessionCode);

   if (room) {
      const socketIds = Array.from(room);
      socket.emit('userChanges', socketIds);
   }
}

io.on('connection', (socket) => {
   console.log('A user connected', socket.id);

   socket.on('createSession', () => {
      const sessionCode = Math.floor(100000 + Math.random() * 900000);
      socket.sessionCode = sessionCode;
      socket.emit('sessionCode', sessionCode);

      // Emit user changes to the host when a user connects
      emitUserChanges(socket, sessionCode);

      console.log(`Session ${sessionCode} has been created by ${socket.id}`);

      // Stop session
      socket.on('stopScreenSharing', () => {
         console.log(`Session ${sessionCode} has been ended by ${socket.id}`);
      });
   });

   socket.on('joinSession', (sessionCode, userId) => {
      console.log(`JoinSession1: ${socket.id} joined session with ${sessionCode}`);

      emitUserChanges(socket, sessionCode);

      // Emit userConnected event to the user who joined
      io.to(sessionCode).emit('userConnected', sessionCode, socket.id);
      console.log(`JoinSession2: Emited userConnected event to user ${socket.id}`);

      // Emit userConnected event to all clients in the session
      emitUserChanges(socket, sessionCode);

      socket.join(sessionCode);

      console.log(`JoinSession3: User ${socket.id} connected to Session ${sessionCode}`);
   });

   socket.on('shareScreen', (sessionCode) => {
     io.to(sessionCode).emit('startScreenSharing');
   });

   socket.on('disconnect', () => {
      console.log('A user disconnected', socket.id);

      // Emit user changes to the host when a user disconnects
      if (socket.sessionCode) {
         emitUserChanges(socket, socket.sessionCode);
      }
   });
});

function checkUsersInSession(sessionCode) {
   setInterval(() => {
      emitUserChanges(sessionCode);
   }, 2000);
}

const PORT = process.env.PORT || 3443;
server.listen(3443, () => {
   console.log(`Server is running on https://${localIpAddress}:${PORT}`);
});
