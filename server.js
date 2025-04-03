const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Adjust path accordingly
  });
  

// Store connected users by event (room)
const connectedUsers = {};

io.on('connection', (socket) => {
  let currentUser = null;
  let currentEvent = null;

  console.log('A user connected');

  // Handle joining an event/room
  socket.on('joinEvent', (data) => {
    currentUser = data.user;
    currentEvent = data.eventId;
    
    console.log(`${currentUser} joined ${currentEvent}`);
    
    // Join the Socket.IO room
    socket.join(currentEvent);
    
    // Initialize user list for this event if needed
    if (!connectedUsers[currentEvent]) {
      connectedUsers[currentEvent] = [];
    }
    
    // Add user to the list
    connectedUsers[currentEvent].push(currentUser);
    
    // Broadcast user joined message
    io.to(currentEvent).emit('userJoined', { user: currentUser });
    
    // Send updated user list to all clients in this event
    io.to(currentEvent).emit('userList', connectedUsers[currentEvent]);
  });

  // Handle sending messages
  socket.on('sendMessage', (data) => {
    console.log(`Message from ${data.user} in ${data.eventId}: ${data.message}`);
    io.to(data.eventId).emit('newMessage', {
      user: data.user,
      message: data.message
    });
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(data.eventId).emit('typing', { user: data.user });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    
    if (currentUser && currentEvent) {
      console.log(`${currentUser} left ${currentEvent}`);
      
      // Remove user from the list
      if (connectedUsers[currentEvent]) {
        const index = connectedUsers[currentEvent].indexOf(currentUser);
        if (index !== -1) {
          connectedUsers[currentEvent].splice(index, 1);
        }
      }
      
      // Broadcast user left message
      io.to(currentEvent).emit('userLeft', { user: currentUser });
      
      // Send updated user list
      if (connectedUsers[currentEvent]) {
        io.to(currentEvent).emit('userList', connectedUsers[currentEvent]);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
