/**** Hapi Route Handler for the presenter (/present.html) ****/
// Want the directory
const Directory = require('./directory.js');

function processPage(request, reply) {
  console.log("POLL METHOD: "+request.route.method);
  // console.log("REQUEST: POLL: ", request);

  const endpointName = request.params.endpointname;

  var endpoint;

  if (endpointName!=null && endpointName.search(/\S/)>=0)
    endpoint = Directory.getOrCreate(endpointName);

  // Return poll results to server Access-Control-Allow-Origin: *
  reply.writeHead(200, {"Content-Type": "application/json", 'Access-Control-Allow-Origin': '*'});
  reply.write(JSON.stringify({directory: Directory.getNames(), messages: endpoint.getMessages()}));
  reply.end();
}
module.exports = {
  method: ['GET'],
  path: '/poll/{endpointname}',
  handler: (request, reply) => {
    // console.log("REQ: ",request);
    processPage(request, reply);
  }
};
