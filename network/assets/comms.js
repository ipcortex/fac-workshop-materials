/* global document */
const EndPoint = (function() {
  // Do a poll... (HTTP get request)
  // var serverAddress = 'https://macbook-pro-3.local:8443';
  // var serverAddress = 'https://192.168.2.9:3000';
  var serverAddress = 'https://127.0.0.1:8000';
  // var serverAddress = '';

  // URLs for RPC operations:
  var url_poll = serverAddress+'/poll/';
  var url_send = serverAddress+'/send/';

  /** @method sendHTTPreq
   *  @description Wrapper function for XMLHttpRequest. Send an HTTP request to
   *  a nominated URL - Utility function
   */
  function sendHTTPreq(method, url, headers, data) {
    return new Promise((resolve, reject) => {
      var body;
      if (method!='GET' && data!=null && data.length>0)
        body = data;

      const xhr = new XMLHttpRequest;

      xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          // console.log("HTTP REQUEST DONE: ",xhr);
          if (xhr.status === 200) {
            // Got the resource. Resolve the waiting promise with the results.
            // If the response type is JSON ten JSON.parse it
            var response = xhr.response;
            if (xhr.getResponseHeader("Content-Type").search(/^application\/json/)==0) {
              response = JSON.parse(xhr.responseText||"({})");
            }
            resolve(response, xhr);
          }
          else {
            reject(xhr, "Failed HTTP request to '"+url+"'");
          }
        }
      };
      xhr.open(method, url, true);

      // Any headers?
      if (headers!=null) {
        var keys = Object.keys(headers);
        keys.forEach(function(k) {
          xhr.setRequestHeader(k, headers[k]);
        });
      }
      xhr.send(body);
    });
  }

  /** @method poll
   * @description A static utility function that sends a poll request to the server and resolves
   * with whatever is returned from the request.
   * @param {String} myName - the end point 'name' for which I want waiting messages
   * @return {Promise} resolves with the result from the
   */
  function poll(myName) {
    return sendHTTPreq('GET', url_poll+myName, null, '');
  }
  /** @method send
   *  @description A static utility function that sends a message to a remove server and resolves
   *  with whatever is returned from the request.
   *  @param {String} fromName
   *  @param {String} toName
   *  @param {String} method   - the operation to invoke at the other end of the link
   *  @param {String} message  - the data to send (parameters) with the method
   *  @return {Promise} resolves with the result returned from the remote end point
   */
  function send(fromName, toName, method, message) {
    return sendHTTPreq('POST', url_send+fromName+'/'+toName+'/'+method, null, JSON.stringify(message));
  }
  /** @class EndPoint @virtual
   *  @description Virtual base communications class. Inherit this into a specific implementation. The
   *  base class implements to underlying comms. Derived classes must override the 'receive' method.
   *
   *  The signaling transport layer *must* be encapsulated in this class such that replacing one transport
   *  (eg REST Polling) with another (eg WebSockets) should not require any changes to the derived classes.
   *  @prop {String} _name - the unique directory name for this end point. It's address.
   *  @prop {Object} _endPoints @static - Directory of local EndPoint objects indexed by _name
   */
  class EndPoint {
    constructor(ep_name) {
      this._name = ep_name;

      EndPoint._endPoints[ep_name] = this;

      // Start background poller
      window.setInterval(() => this._poll(), 2000);
    }
    /** @method log
     *  @description simple wrapper around console.log that prefixes the name ofthe EndPoint that's generating the message
     */
    log(...args) {
      console.log('NAME: '+this._name,...args);
    }
    /** @method get
     *  @description Every end point has to have a name which must be unique. This method
     *  returns the instance of EndPoint with the specified name.
     *  @param {String} name - the name of the EndPoint to return
     *  @return {EndPoint}
     */
    static get(ep_name) {
      return EndPoint._endPoints[ep_name];
    }
    /** @method _poll @private
     *  @description This signalling implementation uses REST polling to retrieve messages from
     *  a central server.
     */
    _poll() {
      poll(this._name).then((res) => {
        if (res!=null) {
          if (res.messages!=null && res.messages.length>0) {
            console.log("DATA RECEIVED FROM POLL: ", res);
            // Process each to the destination (me)
            res.messages.forEach((msg) => {
              var params;
              console.log("PROCESSING MSG: "+msg.from+' -> '+this._name+" INVOKE: "+msg.method+" WITH: ", msg.data);
              if (msg.data!=null)
                params = JSON.parse(msg.data);
              console.log("PARAMS: ", params);
              this.receive(msg.from, msg.method, params);
            });
          }
        }
      });
    }
    /** @method send
     *  @description Send a message to the named target EndPoint (which is usually on a remote client)
     *  @param {String} targetName - the unique name of the end point
     *  @param {String} method - the method name or operation we want the remote EndPoint to execute
     *  @param {Object} [msg] - optional parameter data to send with this message
     */
    send(targetName, method, msg) {
      // Target is the name - and it can't be the name of this end point.
      console.log("SEND FROM: "+this._name+" -> "+targetName+" CALLING "+method+" WITH "+JSON.stringify(msg||''));
      if (targetName!=null && targetName!=this._name) {
        send(this._name, targetName, method, msg);
      }
    }
    /** @method receive
     *  @description This method will return a message from a remote end point. This method *MUST* be overridden in the
     *  derived class. The child class method will take the following parameters:
     */
    receive() {
      console.error("Virtual base class method 'receive' called - this should always be overridden in a derived class");
    }
  }
  EndPoint._endPoints = {};

  return EndPoint;
})();
