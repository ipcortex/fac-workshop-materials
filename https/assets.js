/**** Hapi Route Handler for the presenter (/present.html) ****/
// Want the directory
const fs = require('fs');

module.exports = {
  method: ['GET'],
  path: '/assets/{filename}',
  handler: (request, reply) => {
    console.log("REQ: ",request);
    // Return static home page.
    // Work out the mime type from the extension (BAD!)
    var mime = request.params.filename.search(/\.css$/)>0 ? 'text/css' : 'application/javascript';
    var path = 'assets/'+request.params.filename;
    if (fs.existsSync(path)) {
      reply.writeHead(200, {"Content-Type": mime});
      fs.createReadStream(path).pipe(reply);
    }
  }
};
