/**** Hapi Route Handler for the presenter (/present.html) ****/
// Want the directory
const Directory = require('./directory.js');

function processPage(request, reply) {
  console.log("SEND METHOD: "+request.route.method);
  // console.log("REQUEST: SEND: ", request);

  const fromName = request.params.fromname;
  const toName   = request.params.toname;
  const method   = request.params.method;

  console.log("FROM NAME: ",fromName," TO NAME: ", toName, "METHOD: "+method+", MESSAGE: ", request.payload);
  console.log("PAYLOAD: "+(typeof request.payload));

  var endpoint;

  if (toName!=null && toName.search(/\S/)>=0)
    endpoint = Directory.get(toName);

  console.log("ENDPOINT: ",endpoint);
  if (endpoint==null) {
    // destination unknown so reply with an error
    // Return poll results to server Access-Control-Allow-Origin: *
    reply.writeHead(200, {"Content-Type": "text/plain", 'Access-Control-Allow-Origin': '*'});
    reply.write('Unknown destination');
  }
  else {
    // Add the message to the queue and return to caller
    endpoint.newMessage(fromName, method, request.payload);
    reply.writeHead(200, {"Content-Type": "text/plain", 'Access-Control-Allow-Origin': '*'});
    reply.write('Success');
  }
  reply.end();
}
module.exports = {
  method: ['POST'],
  path: '/send/{fromname}/{toname}/{method}',
  handler: (request, reply) => {
    // console.log("REQ: ",request);
    processPage(request, reply);
  }
};
