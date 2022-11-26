const express = require('express');
const app = express();
const cors = require('cors'); // added due to this video: https://www.youtube.com/watch?v=djMy4QsPWiI

app.use(cors()); // added via link rec on line 2

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const people = {};
const sockmap = {};
const messageque = {};

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

  const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});

io.on('connection', (socket) => {
    socket.on("join", (nick,room) => {
		socket.join(room);
		//const id=stringHash(nick);
		if(!people.hasOwnProperty(room)){
			people[room]={};
		}
		
		people[room][socket.id] = {
			nick : nick,
			id : socket.id
		};
		sockmap[socket.id] = {
			nick : nick,
			room : room
		}
		if(messageque.hasOwnProperty(room)){
			for(i=0;i<messageque[room].length;i++){
				io.to(room).emit('message que', messageque[room][i].nick,messageque[room][i].msg);
			}
		}
		if(room=='')
			socket.emit("update", "You have connected to the default room.");
		else	
		socket.emit("update", `You have connected to room ${room}.`);
		socket.emit("people-list", people[room]);
		socket.to(room).broadcast.emit("add-person",nick,socket.id);
		console.log(nick);
		socket.to(room).broadcast.emit("update", `${nick} has come online. `);
	});

	socket.on('chat message', (msg,room) => {
		io.to(room).emit('chat message', people[room][socket.id].nick,msg);
		if(!messageque.hasOwnProperty(room)){
			messageque[room]=[]
		}
		messageque[room].push({
			nick : people[room][socket.id].nick,
			msg : msg
		})
		if(messageque[room].length>50)
			messageque[room].shift()
	});

	socket.on('disconnect', () => {
		if(sockmap[socket.id]){
			const room=sockmap[socket.id].room;
			socket.to(room).broadcast.emit("update", `${sockmap[socket.id].nick} has disconnected. `);
			io.emit("remove-person",socket.id);
			delete people[room][socket.id];
			delete sockmap[socket.id];	
		}	
	});
  });

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
