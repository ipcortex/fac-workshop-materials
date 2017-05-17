// curl -k https://localhost:8000/
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('certs/key.pem'),
  cert: fs.readFileSync('certs/cert.pem')
};

// Our routes...
const routes = [
  require('./assets.js'),
  require('./home.js'),
];

var rootDir = (__dirname).replace(/^.*\//,'');
process.chdir(__dirname);
console.log("ROOT DIR: "+__dirname);
function decodePath(req) {
  return (req.url||'/').replace(/^.\:\d+/,'').replace(/\?.*$/,'');
}
function processRequest(req, res, method, path, payload) {
  // Split the path into fragments and look for a matching element.
  var pathParts = path.replace(/^\/(\:\d+)?|\/$/g,'').split(/\//g);

  method = method.toUpperCase();
  res.statusCode = 404;
  var ok = routes.some((r) => {
    // Match method and path?
    if (r.method.indexOf(method)>=0 && pathParts.length==r.path.length) {
      var exact = r.path.every(function(v,idx) {
        return (v.t=='param' || (v.t=='literal' && v.v==pathParts[idx]));
      });
      if (exact) {
        // We have a match. Decode any path paramters
        req.route = r;
        req.payload = (payload||'');
        req.rootDir = rootDir;

        var pathParams = req.params = {};
        r.path.forEach((v, idx) => {
          if (v.t=='param')
            pathParams[v.v] = pathParts[idx];
        });
        console.log("EXECUTE PATH: "+path+" WITH PAYLOAD: "+(payload|| '*NONE*'));
        r.handler(req, res);
        return true;
      }
    }
    return false;
  });
  if (res.statusCode==404) {
    // Nothing changed the response code from 404 so
    res.writeHead(404, 'NOT FOUND');
    res.end();
  }
}

var paramRegexp = /^\{([\w_\-\$]+)\}$/;
function prepareRoutes() {
  // Once only pass through the 'routes' array to make it more usable.
  routes.forEach((r) => {
    r.path = r.path.replace(/^\/|\/$/g,'').split(/\//g).map((p) => {
      var param = paramRegexp.exec(p);
      return (param==null) ? {t: 'literal', v: p} : {t: 'param', v: param[1]};
    });
  });
  console.log("ROUTES: ",JSON.stringify(routes));
}
prepareRoutes();

https.createServer(options, (req, res) => {
  // What's the path?
  var path = decodePath(req);
  var body = '';

  if (req.method.search(/^POST$/i)==0) {
    // Get all POST data then handle request.
    req.on('data', (chunk) => {
      console.log("DATA CHUNK: "+chunk);
      body += chunk;
    });
    req.on('end', (chunk) => {
      console.log("REQUEST END: "+(chunk||''));
      if (chunk) {
        body += chunk;
      }
      // var params = decodeParameters(req, body)
      processRequest(req, res, req.method, path, body);
    });
  }
  else {
    processRequest(req, res, req.method, path);
  }
}).listen(8000);
