const { Server } = require("socket.io");
const amqp = require("amqplib");
const { publishHoverOnCard, publishHoverOffCard } = require("./broker");

function initializeWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const rooms = {};
  const socketToUser = {};
  let channel;

  // RabbitMQ
  (async () => {
    try {
      const connection = await amqp.connect("amqp://localhost");
      channel = await connection.createChannel();
      await channel.assertExchange("game_exchange", "topic", { durable: false });

      console.log("RabbitMQ kapcsolat letrejott (topic exchange)!");
    } catch (error) {
      console.error("RabbitMQ kapcsolodasi hiba:", error);
    }
  })();

  io.on("connection", (socket) => {
    console.log(`Uj WebSocket kapcsolat jott letre: ${socket.id}`);

    socket.on("join_room", ({ roomId, playerName }) => {
      if (!rooms[roomId]) {
        rooms[roomId] = { players: [] };
      }
      socketToUser[socket.id] = { roomId, playerName };
      rooms[roomId].players.push(playerName);
      socket.join(roomId);

      io.to(roomId).emit("userJoined", {
        roomId,
        players: rooms[roomId].players,
      });
    });

    socket.on("hoverOnCard", ({ roomId, cardContainerID, color }) => {
      const userData = socketToUser[socket.id];
      if (!userData) {
        return;
      }
      const playerName = userData.playerName;

      console.log(`hoverOnCard: ${playerName} -> ${cardContainerID}, color=${color}`);
      publishHoverOnCard(roomId, cardContainerID, color, playerName);
    });

    socket.on("hoverOffCard", ({ roomId, cardContainerID }) => {
      const userData = socketToUser[socket.id];
      if (!userData) {
        return;
      }
      const playerName = userData.playerName;

      console.log(`hoverOffCard: ${playerName} -> ${cardContainerID}`);
      publishHoverOffCard(roomId, cardContainerID, playerName);
    });

  });

  return io;
}

module.exports = initializeWebSocket;
