const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const os = require('os');

app.use(express.static(path.join(__dirname)));
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

io.on('connection', (socket) => {
   console.log('A user connected', socket.id);

   socket.on('createSession', () => {
      const sessionCode = Math.floor(100000 + Math.random() * 900000);
      socket.sessionCode = sessionCode;
      socket.emit('sessionCode', sessionCode);
      console.log(`Session ${sessionCode} has been created by ${socket.id}`);

      //Emit userConnected message to all clients in the session
      io.to(sessionCode).emit('userConnected', sessionCode, socket.id);
      console.log(`User ${socket.id} connected to Session ${sessionCode}`);

      // Stop session
      socket.on('stopScreenSharing', () => {
         console.log(`Session ${sessionCode} has been ended by ${socket.id}`);
      });
   });

   socket.on('joinSession', (sessionCode) => {
      console.log(`JoinSession1: ${socket.id} joined session with ${sessionCode}`);
      socket.join(sessionCode);

      // Emit userConnected event to the user who joined
      io.to(sessionCode).emit('userConnected', sessionCode, socket.id);
      console.log(`JoinSession2: Emited userConnected event to user ${socket.id}`);

      // Emit userConnected event to all clients in the session
      io.to(socket.it).emit('userConnect', sessionCode, socket.id);
      console.log(`JoinSession3: Emited userConnected event to all clients in session ${sessionCode}`);

      console.log(`JoinSession4: User ${socket.id} connected to Session ${sessionCode}`);
   });

   socket.on('shareScreen', (sessionCode) => {
     socket.to(sessionCode.emit('startScreenSharing'));
   });

   socket.on('disconnect', () => {
      console.log('A user disconnected', socket.id);
   });
});

const PORT = process.env.PORT || 3443;
server.listen(3443, () => {
   console.log(`Server is running on https://${localIpAddress}:${PORT}`);
});
