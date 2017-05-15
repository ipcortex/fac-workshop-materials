/* global document */
const EndPoint =
(function() {
  /** @class EndPoint @virtual
   *  @description Virtual base communications class. Inherit this into a specific implementation. The
   *  base class implements the underlying comms. Derived classes must override the 'receive' method.
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
    }
    /** @method log
     *  @description simple wrapper around console.log that prefixes the name ofthe EndPoint that's generating the message
     */
     log(...args) {
       console.log('NAME: '+this._name,...args);
     }
    /** @method get
     *  @description Every end point has to have a name which must be unique. This method
     *  returns the LOCAL instance of and EndPoint with the specified name. Note that this
     *  can only return local endpoints and has no knowledge of other operational clients.
     *  @param {String} name - the name of the EndPoint to return
     *  @return {EndPoint}
     */
    static get(ep_name) {
      return EndPoint._endPoints[ep_name];
    }
    /** @method send
     *  @description Send a message to the named target EndPoint (which is usually on a remote client)
     *  @param {String} targetName - the unique name of the end point
     *  @param {String} operation - the method name or operation we want the remote EndPoint to execute
     *  @param {Object} [data] - optional parameter data to send with this message
     */
    send(targetName, operation, data) {
      // Target is the name - and it can't be the name of this end point.
      this.log("SEND TO -> "+targetName+" REQUEST "+operation+" WITH "+JSON.stringify(data||null));
      if (targetName!=null && targetName!=this._name) {
        // Find the local end point with the target name
        var target = EndPoint._endPoints[targetName];
        if (target!=null)
          target.receive(this._name, operation, data);
        else
          this.log("Can't find target: ", target);
      }
      else {
        this.log("Invalid target: ", target);
      }
    }
    /** @method receive
     *  @description This method will return a message from a remote end point. This method *MUST* be overridden in the
     *  derived class. The child class method will take the following parameters:
     */
    receive(/* fromName, operation, data */) {
      console.error("Virtual base class method 'receive' called - this should always be overridden in a derived class");
    }
  }
  EndPoint._endPoints = {};

  return EndPoint;
})();
