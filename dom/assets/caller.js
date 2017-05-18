/* global document, EndPoint */
const VideoEndPoint = (function() {
  const RING_TIMEOUT = 5000; // 5 seconds.

  /** @class VideoEndPoint
   *  @description Each instance of this class represents a single EndPoint. In practice or a real application
   *  there would be exactly ONE instance of this class in the system.
   *  @prop {String} _state - Current call state. Either: 'IDLE', 'CALLER' (making a call) or 'CALLED' (receiving a call)
   *  @prop {Promise} [_localMediaPromise] - if not null then this promise resolves to the media to be used for this EndPoint. Created on first request.
   *
   */
  class VideoEndPoint extends EndPoint {
    constructor(name, videoRemoteTag, videoLocalTag, statusTag) {
      // Create a poller for this client
      super(name);
      this._videoRemoteTag = videoRemoteTag;
      this._videoLocalTag  = videoLocalTag;
      this._statusTag      = statusTag;
      this._state          = 'IDLE';
    }
    /** @method setState
     *  @description Single point through which state changes are made. Simple utility that allows us to easily
     *  trace state changes.
     *  @param {String} newState - The new state for this end point
     *  @return {EndPoint} this - to allow chaining.
     */
    setState(newState) {
      this.log("STATE CHANGE FROM "+this._state+" TO "+newState);
      this._state = newState;
      this._statusTag.innerHTML = newState;
      return this;
    }
    /** @method receive
     *  @description Entry point called by the base class when it receives a message for this object from another EndPoint.
     *  @param {String} from - the directory name of the remote EndPoint that sent this request
     *  @param {String} operation - the text string identifying the name of the method to invoke
     *  @param {Object} [data] - the opaque parameter set passed from the remote EndPoint to be sent to the method handler
     */
    // Provide the required 'receive' method
    receive(from, operation, data) {
      this.log("END POINT RX PROCESSING... ("+from+", "+operation+")", data);
      switch (operation) {
      case 'CALL_REQUEST':
        this.incomingCall(from, data);
        break;
      case 'DENIED':
        this.callDenied(from, data);
        break;
      case 'ACCEPT_CALL':
        this.callAccepted(from, data);
        break;
      case 'END_CALL':
        this.endCall(from, data);
        break;
      /* MESSAGES USED TO CARRY WEBRTC SIGNALLING */
      case 'SDP_OFFER':
        break;
      case 'SDP_ANSWER':
        break;
      case 'ICE_CANDIDATE':
        break;
      }
    }
    /** @method incomingCall
     *  @description incoming call request handler. If this EndPoint is IDLE then we accept the call
     *   and reply with 'ACCEPT_CALL'. If we're already busy then reject the call by sending 'DENIED'.
     *
     *   If the call is accepted we create our local peer connection ready for the remote end and then
     *   set our state to 'CALLED' (receiving a call).
     */
    incomingCall(from) {
      // Only accept a call if we're currently idle
      this.log("REQUESTING INCOMING CALL FROM: "+from);
      if (this._state!='IDLE')
        this.send(from, 'DENIED');
      else {
        this.setState('CALLED');
        this._party = from;
        this.send(from, 'ACCEPT_CALL');
      }
    }
    /** @method callAccepted
     *  @description Response from the remote EndPoint to our CALL_REQ method accepting our invitation. We
     *   record our state as 'TX' (outgoing call), create a peer connection and then offer audio and video
     *   to the remote end.
     *
     *   Once we have a Peer Connection we create our offer, wait for that to resolve and store the result
     *   as out local description and send the offer to the remote EndPoint ('OFFER').
     */
    callAccepted(from) {
      if (this._state == 'RINGING' && this._party==from) {
        this.log("CALL ACCEPTED: "+from);
        if (this._ringTimer!=null) {
          // Cancel any remaining timeout
          window.clearTimeout(this._ringTimer);
          delete this._ringTimer;
        }
        this.setState('CALLER');
      }
    }
    /** @method callDenied
     *  @description Response from the remote EndPoint to our CALL_REQ method declining our invitation. In this
     *  implementation the only reason we decline a call is if we are already on another call.
     */
    callDenied(from) {
      if (this._state=='RINGING' && this._party==from) {
        this.log("CALL DENIED: "+from);
        alert("Can't call "+from+", the line is busy or the target address is offline/doesn't exist...");
        this.setState('IDLE');
        delete this._party;
        if (this._ringTimer!=null) {
          // Cancel any remaining timeout
          window.clearTimeout(this._ringTimer);
          delete this._ringTimer;
        }
      }
    }
    /** @method endCall
     *  @description Called to close the local end of a call. Can be called directly if it's our end
     *  or as the result of a remote method invocation.
     */
    endCall(from /*, data */) {
      if ((this._state=='CALLED' || this._state=='CALLER') && this._party==from) {
        if (this.peerConnector!=null) {
          // We have a Peer Connector that needs to be closed now
          this.peerConnector.close();
          delete this.peerConnector;
        }
        this.setState('IDLE');

        this._videoRemoteTag.pause();
        this._videoRemoteTag.srcObject = null;
        this._videoLocalTag.pause();
        this._videoLocalTag.srcObject = null;
      }
    }
    /** @method hangupCall
     *  @description The localEndPoint (THIS) wants to terminate the call. This is generally the result of the user
     *  clicking the hang-up button. We call our local 'endCall' method and then send 'END_CALL' to the remote party.
     */
    hangupCall() {
      // Are we in a call?
      if (this._state=='CALLED' || this._state=='CALLER') {
        this.endCall(this._party);

        // We're the end hanging up the call so we need to tell the other end
        this.send(this._party, 'END_CALL');
        delete this._party;
      }
    }
    /** @method startCall
     *  @description The user wants to make a call to a remote EndPoint (target). This first part of the process
     *  is to send a message to the target to request the call. The remote EndPoint may accept the call by sending
     *  'ACCEPT_CALL' or decline the call by sending 'DENIED'. Nothing happens at our end other than to send the
     *  message requesting the call. The actuall call is set up if the remote station accepts and sends 'ACCEPT_CALL'.
     *
     *  If the local EndPoint (this) is already in a call (_state is NOT IDLE) then we refuse to start another call.
     *  @param {String} target - the name of the remote party that we want to start a call with
     */
    startCall(target) {
      if (this._state=='IDLE') {
        this.setState('RINGING');
        this._party = target;

        // Start a timer in case there's no response from the remote end.
        this._ringTimer = window.setTimeout(() => {
          this.log("CALL FAILED - "+this._state+", Timeout",target,this._party);
          delete this._ringTimer;
          this.callDenied(target);
        }, RING_TIMEOUT);

        this.send(target, 'CALL_REQUEST');
      }
      else {
        alert("Can't make another call - busy");
      }
    }
    /** @method pauseCall
     *  @description Pause our AV for the current call on this EndPoint. This is identical for either party in a call
     *  and simply involves taking out media and then toggling the enabled state for each track in the stream.
     */
    pauseCall() {
      if (this._state != 'IDLE') {
        this.log("LOCAL MEDIA PAUSED");
      }
    }
  }

  return VideoEndPoint;
})();
