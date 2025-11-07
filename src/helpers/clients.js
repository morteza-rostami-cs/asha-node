// each client in this map has a send() function
// eg: 'client1': send()
// and each send function holds a unique response object for a http request
// raw.reply -> has that unique response object
// send() => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
export const clients = new Map();

/**
 * Send a message to a specific client.
 */
export function sendToClient(commentId, data) {
  const send = clients.get(commentId);
  console.log(
    "sending a message to client SSE****************",
    clients,
    commentId,
    send
  );
  if (send) send(data);
}

/**
 * Broadcast a message to all clients.
 */
export function broadcast(data) {
  for (const send of clients.values()) {
    send(data);
  }
}
