/**** Hapi Route Handler for the presenter (/present.html) ****/
// Want the directory
const Directory = require('./directory.js');
const fs = require('fs');

module.exports = {
  method: ['GET'],
  path: '',
  handler: (request, reply) => {
    // console.log("REQ: ",request);
    // Return static home page.
    if (fs.existsSync('src/home.html')) {
      reply.writeHead(200, {"Content-Type": "text/html"});
      fs.createReadStream('src/home.html').pipe(reply);
    }
  }
};
