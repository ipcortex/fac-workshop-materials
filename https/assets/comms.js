/* global document */
const EndPoint =
(function() {
  /** @class EndPoint @virtual
   *  @description Virtual base communications class. Inherit this into a specific implementation. The
   *  base class implements the underlying comms. Derived classes must override the 'receive' method.
   *
   *  The signaling transport layer *must* be encapsulated in this class such that replacing one transport
   *  (eg REST Polling) with another (eg WebSockets) should not require any changes to the derived classes.
   */

  class EndPoint {
    constructor(ep_name) {
      this._name = ep_name;
      EndPoint.names[ep_name] = this;
    }
    /** @method log
     *  @description simple wrapper around console.log that prefixes the name ofthe EndPoint that's generating the message
     */
    log(...args) {
      console.log('NAME: '+this._name,...args);
    }

    /** @method send
     *  @description Send a message to the named target EndPoint (which is usually on a remote client)
     *  @param {String} targetName - the unique name of the end point
     *  @param {String} operation - the method name or operation we want the remote EndPoint to execute
     *  @param {Object} [data] - optional parameter data to send with this message
     */
    send(targetName, operation, data) {
      EndPoint.names[targetName].receive(this._name, operation, data);
      
    }
    /** @method receive
     *  @description This method will return a message from a remote end point. This method *MUST* be overridden in the
     *  derived class. The child class method will take the following parameters:
     */
    receive(/* fromName, operation, data */) {
      console.error("Virtual base class method 'receive' called - this should always be overridden in a derived class");
    }
  }

  EndPoint.names = {};

  return EndPoint;
})();
