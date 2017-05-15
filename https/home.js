/**** Hapi Route Handler for the presenter (/present.html) ****/
const fs = require('fs');

module.exports = {
  method: ['GET'],
  path: '',
  handler: (request, reply) => {
    // console.log("REQ: ",request);
    // Return static home page.
    if (fs.existsSync('./home.html')) {
      reply.writeHead(200, {"Content-Type": "text/html"});
      fs.createReadStream('./home.html').pipe(reply);
    }
  }
};
