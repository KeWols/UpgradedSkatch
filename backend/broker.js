const amqp = require("amqplib");

let channel, connection;


async function connectBroker(){

  if (channel){
    return channel;
  } 

  try {
    
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    // A 'fanout' helyett most 'topic'-et használunk
    await channel.assertExchange("game_exchange", "topic", { durable: false });

    console.log("✅ RabbitMQ kapcsolat létrejött (topic exchange)!");
    return channel;
  } catch (error) {
    console.error("🚨 RabbitMQ kapcsolódási hiba:", error);
    throw error;
  }
}

// ❌ RabbitMQ kapcsolat lezárása (ha szükséges)
async function closeBroker() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log("❌ RabbitMQ kapcsolat lezárva!");
  } catch (error) {
    console.error("🚨 RabbitMQ lezárási hiba:", error);
  }
}

async function subscribeToRoomEvent(roomId, eventKey, callback) {
  const ch = await connectBroker();
  const routingKey = `${roomId}.${eventKey}`;

  await ch.assertExchange("game_exchange", "topic", { durable: false });
  const q = await ch.assertQueue("", { exclusive: true });

  await ch.bindQueue(q.queue, "game_exchange", routingKey);

  ch.consume(
    q.queue,
    (msg) => {
      if (msg && msg.content) {
        const data = JSON.parse(msg.content.toString());
        callback(data);
      }
    },
    { noAck: true }
  );

  console.log(`✅ Feliratkozva a topicra: ${routingKey}`);
}

async function publishToRoomEvent(roomId, eventKey, payload) {
  const ch = await connectBroker();
  const routingKey = `${roomId}.${eventKey}`;

  await ch.assertExchange("game_exchange", "topic", { durable: false });
  ch.publish("game_exchange", routingKey, Buffer.from(JSON.stringify(payload)));

  console.log(`📤 Published to ${routingKey}:`, payload);
}

// ==== Hover események spec. segédfüggvények ====

async function subscribeHoverOnCard(roomId, callback) {
  return subscribeToRoomEvent(roomId, "hoverOnCard", callback);
}

async function subscribeHoverOffCard(roomId, callback) {
  return subscribeToRoomEvent(roomId, "hoverOffCard", callback);
}

async function publishHoverOnCard(roomId, cardContainerID, color, playerName) {
  // return publishToRoomEvent(roomId, "hoverOnCard", payload);
  const message = JSON.stringify({
    cardContainerID,
    color,
    playerName,  // **Fontos, hogy továbbítsuk!**
    timestamp: Date.now(),
  });

  channel.publish(`game_exchange`, `${roomId}.hoverOnCard`, Buffer.from(message));
  console.log(`📤 Published to ${roomId}.hoverOnCard: ${message}`);
}

async function publishHoverOffCard(roomId, cardContainerID, playerName) {
  // return publishToRoomEvent(roomId, "hoverOffCard", payload);
  const message = JSON.stringify({
    cardContainerID,
    color: "transparent",
    playerName,
    timestamp: Date.now(),
  });

  channel.publish(`game_exchange`, `${roomId}.hoverOffCard`, Buffer.from(message));
  console.log(`📤 Published to ${roomId}.hoverOffCard: ${message}`);
}

// =============== Új reveal/hide események ===============
async function publishCardToReveal(roomId, cardContainerID, playerName) {
  // Minden "másik" játékos ezt kapja: -> opponentRevealed.png
  const payload = {
    cardContainerID,
    playerName,
    timestamp: Date.now()
  };
  return publishToRoomEvent(roomId, "cardToReveal", payload);
}

async function publishCardToHide(roomId, cardContainerID, playerName) {
  const payload = {
    cardContainerID,
    playerName,
    timestamp: Date.now()
  };
  return publishToRoomEvent(roomId, "cardToHide", payload);
}

async function publishNextTurn(roomId, nextPlayer) {
  const payload = { roomId, nextPlayer };
  return publishToRoomEvent(roomId, "nextTurn", payload);
}

async function subscribeNextTurn(roomId, callback) {
  subscribeToRoomEvent(roomId, "nextTurn", callback);
}

async function publishDrawCard(roomId, nthCardInDeck, playerName) {
  const payload = {
    nthCardInDeck,
    playerName,
    timestamp: Date.now(),
  };
  return publishToRoomEvent(roomId, "drawCard", payload);
}

async function subscribeDrawCard(roomId, callback) {
  return subscribeToRoomEvent(roomId, "drawCard", callback);
}

module.exports = {
  connectBroker,
  closeBroker,
  subscribeToRoomEvent,
  publishToRoomEvent,
  //subscribeHoverOnCard,
  //subscribeHoverOffCard,
  publishHoverOnCard,
  publishHoverOffCard,

  publishCardToReveal,
  publishCardToHide,

  publishNextTurn,
  subscribeNextTurn,

  subscribeDrawCard,
  publishDrawCard,
};
