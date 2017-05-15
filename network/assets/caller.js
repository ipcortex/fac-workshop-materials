/* global document */
const VideoEndPoint = (function() {
  const RING_TIMEOUT = 3000; // 3 seconds.

  function _onCreateSessionDescriptionError(error) {
    console.log('===============================================================');
    console.log('Failed to create session description: ' + error.toString());
  }

  /** @class VideoEndPoint
   *  @description Each instance of this class represents a single EndPoint. In practice or a real application
   *  there would be exactly ONE instance of this class in the system.
   *  @prop {String} _state - Current call state. Either: 'IDLE', 'CALLER' (making a call) or 'CALLED' (receiving a call)
   *  @prop {Promise} [_localMediaPromise] - if not null then this promise resolves to the media to be used for this EndPoint. Created on first request.
   *
   */
  class VideoEndPoint extends EndPoint {
    constructor(...args) {
      // Create a poller for this client
      super(...args);

      this._state = 'IDLE';
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
      return this;
    }
    /** @method getMediaStream
     *  @description Return a Promise that resolves to the media to be used for this user. Each EndPoint has it's own Promise. The
     *  first time this method is invoked on an EndPoint it requests the media from the browser and stores the media promise returned.
     *  @return {Promise} that resolves when media is available.
     */
    getMediaStream() {
      if (this._localMediaPromise==null) {
        this._localMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });
      }
      return this._localMediaPromise;
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
      case 'SDP_OFFER':
        this.receivedIncomingSDPoffer(from, data);
        break;
      case 'SDP_ANSWER':
        this.receivedIncomingSDPanswer(from, data);
        break;
      case 'ICE_CANDIDATE':
        this.receivedIceCandidate(from, data);
        break;
      case 'END_CALL':
        this.endCall(from, data);
        break;
      }
    }
    /** @method createPeerConnection
     *  @description Create an RTCPeerConnection object for this EndPoint and send it to a remote EndPoint. As
     *  part of the process the method gets the media stream from the browser and attaches it to the
     *  local (.self) video tag.
     *  @param {String} from - the name of the remote EndPoint with which we're making a call.
     *  @return {Promose} resolves when the Peer Connection has been created and the media streams
     *  have been successfully attached.
     */
    createPeerConnection() {
      var videoWrap = document.querySelector('#'+this._name);
      var videoTag = videoWrap.querySelector('.video');

      // Create a peer connector for our end of this conversation
      var pc = this.peerConnector = new RTCPeerConnection();
      this.log("PEER CONNECTOR CREATED");
      pc.onicecandidate = (e) => {
        this.log("HAVE ICE CANDIDATE (CALLED): ", e);
        if (e.candidate!=null)
          this.send(this._party, "ICE_CANDIDATE", e.candidate);
        else
          this.log("NOT SENDING EMPTY CANDIDATE");
      };
      pc.onaddstream = (e) => {
        this.log('Received remote stream for: ', this._name);
        videoTag.srcObject = e.stream;
        videoTag.play();
      };
      // Get our media and attach to the local tag and the PC
      var videoSelfTag = videoWrap.querySelector('.self');

      return this.getMediaStream().then((mediaStream) => {
        // Create a peer connector for our end of this call
        pc.addStream(mediaStream);

        // Attach this stream to a video tag...
        videoSelfTag.srcObject = mediaStream;

        // And set the 'play' state for this tag.
        videoSelfTag.play();

        return Promise.resolve(pc);
      });
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

        this.createPeerConnection(from);

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

        // And then give the transmitting stream the ones we have
        this.createPeerConnection(from).then((pc) => {
          this.log('PeerConnector (CALLER) createOffer start');
          var offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
          };
          pc.createOffer(
            offerOptions
          ).then(
            (offer) => {
              this.log("WE HAVE AN OFFER...",offer);

              // Give the offer description to our end of the connector
              pc.setLocalDescription(offer);

              // Send the offer to the remote end of the peer connector
              this.send(from, "SDP_OFFER", offer);
            },
            _onCreateSessionDescriptionError
          );
        });
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
    /** @method receivedIncomingSDPoffer
     *  @description Process an incoming SDP offer. This is ignored if we're not currently the receiving party in a
     *  call. We store the description as our remote description and then create an SDP answer which we store
     *  as our local description then send back to the instigator of the call with the 'SDP_ANSWER' method.
     */
    receivedIncomingSDPoffer(from, data) {
      this.log("PROCESSING INCOMING SDP OFFER...");
      if (this._state=='CALLED') {
        this.log("Accepting incoming offer...", data);
        this.peerConnector.setRemoteDescription(data).then(
          () => this.log("setRemoteDescription COMPLETE"),
          () => this.log("setRemoteDescription FAILED")
        );
        // Create our answer ONLY after we have our own media
        this.getMediaStream().then(() => {
          // And generate an answering offer
          this.peerConnector.createAnswer().then(
            (desc) => {
              this.log('Answer from RECEIVER {'+this._name+'}:\n' + desc.sdp);
              this.peerConnector.setLocalDescription(desc);

              // And send this to desciption to the remote end
              this.send(from, "SDP_ANSWER", desc);
            },
            _onCreateSessionDescriptionError
          );
        });
      }
    }
    /** @method receivedIncomingSDPoffer
     *  @description We've sent and SDP description to the EndPoint we're calling and this is the answer to that
     *  offer. We store this as out remote description.
     */
    receivedIncomingSDPanswer(from, data) {
      this.log("PROCESSING INCOMING SDP ANSWER...");
      if (this._state=='CALLER') {
        this.log("Accepting incoming offer...", data);
        this.peerConnector.setRemoteDescription(data).then(
          () => this.log("setRemoteDescription COMPLETE"),
          () => this.log("setRemoteDescription FAILED")
        );
      }
    }
    /** @method receivedIceCandidate
     *  @description An serialised ICE candidate has been received. There can be multiple ICE candidates per call. Each needs to be
     *  restored by creating a new RTCIceCandidate object and then giving that to the calls peer connection object.
     */
    receivedIceCandidate(from, data) {
      if (this._state!='IDLE') {
        this.log("PROCESSING INCOMING CANDIDATE FOR: "+this._name, data);
        var candidate = new RTCIceCandidate(data);
        this.log("CREATED CANDIDATE: ", candidate);
        this.log("PEER CONNETOR: ",this.peerConnector);
        this.peerConnector.addIceCandidate(candidate)
        .then(
          () => {this.log("Found ICE candidates",this.peerConnector);},
          (err) => {
            this.log('===============================================================');
            this.log("ERROR: Can't Find ICE candidates",err,this.peerConnector);
          }
        );
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

        // Find the two video tags we have (the remote end and the thumbnail of ourselves) and close.
        var videoWrap = document.querySelector('#'+this._name);
        var videoTag = videoWrap.querySelector('.video');
        var videoSelfTag = videoWrap.querySelector('.self');

        videoTag.pause();
        videoTag.srcObject = null;
        videoSelfTag.pause();
        videoSelfTag.srcObject = null;
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
        this.send(target, 'CALL_REQUEST');

        // Start a timer in case there's no response from the remote end.
        this._ringTimer = window.setTimeout(() => {
          this.log("CALL FAILED - "+this._state+", Timeout",target,this._party);
          delete this._ringTimer;
          this.callDenied(target);
        }, RING_TIMEOUT);
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
        this.getMediaStream().then((media) => {
          this.log("GOT STREAM TO PAUSE");
          media.getTracks().forEach((track) => {
            this.log("TOGGLING TRACK STATE: ",track);
            track.enabled = !track.enabled;
          });
        });
        // tag.srcObject.getTracks().forEach(t => t.enabled = !t.enabled);
      }
    }
  }

  return VideoEndPoint;
})();
