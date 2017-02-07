/* global document */
(function() {
  document.addEventListener("DOMContentLoaded", function() {
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
     *  @prop {EndPoint} _roster[]  - Set of all known EndPoints
     *  @prop {Object} _endPoints @static - Directory of local EndPoint objects indexed by _name
     */
    class EndPoint {
      constructor(ep_name) {
        this._name = ep_name;
        this._roster = [];

        EndPoint._endPoints[ep_name] = this;

        // Start background poller
        window.setInterval(() => this._poll(), 2000);
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
            if (res.directory!=null) {
              // Compare directory with existing roster
              var online = {};
              res.directory.forEach((n) => {
                online[n]=1;
              });
              var changed = false, newRoster=[];
              // Any names we don't know about

              this._roster.forEach((old) => {
                if (online.hasOwnProperty(old)) {
                  // Still online
                  newRoster.push(old);
                  delete online[old];
                }
              });
              var changed = (newRoster.length!=this._roster.length);
              // Anyone left in 'online' is new
              var newMembers = Object.keys(online);

              if (newMembers.length>0) {
                newRoster.splice(0,0,...newMembers);
                changed = true;
              }
              if (changed) {
                console.log("ROSTER CHANGED...", newRoster);
                this._roster = newRoster;
                this.updateRoster();
              }
            }
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

    /** @class VideoEndPoint
     *  @description Each instance of this class represents a single EndPoint. In practice or a real application
     *  there would be exactly ONE instance of this class in the system.
     *  @prop {String} _state - Current call state. Either: 'IDLE', 'TX' (making a call) or 'RX' (receiving a call)
     *  @prop {Promise} [_localMediaPromise] - if not null then this promise resolves to the media to be used for this EndPoint. Created on first request.
     *
     */
    class VideoEndPoint extends EndPoint {
      constructor(...args) {
        // Create a poller for this client
        super(...args);

        this._state = 'IDLE';
      }
      /** @method getMediaStream
       *  @description Return a Promise that resolves to the media to be used for this user. Each EndPoint has it's own Promise. The
       *  first time this method is invoked on an EndPoint it requests the media from the browser and stores then media promise returned.
       *  @return {Promise} that resolves when media is available.
       */
      getMediaStream() {
        if (this._localMediaPromise==null) {
          this._localMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });
        }
        return this._localMediaPromise;
      }
      /** @method updateRoster
       *  @description Called by the base class when it detects a change in the stations currently available. This
       *  method redraw the options available in the remote EndPoint list (drop down list).
       */
      updateRoster() {
        // Flush the current roster and re-render.
        var select = document.querySelector('#'+this._name+' select');
        var options = [];
        this._roster.forEach((n) => {
          if (n!=this._name)
            options.push('<option>'+n+'</option>');
        });
        select.innerHTML = '<option>-- call destination --</option>'+options.join('');
      }
      /** @method receive
       *  @description Entry point called by the base class when it receives a message for this object from another EndPoint.
       *  @param {String} from - the directory name of the remote EndPoint that sent this request
       *  @param {String} operation - the text string identifying the name of the method to invoke
       *  @param {Object} [data] - the opaque parameter set passed from the remote EndPoint to be sent to the method handler
       */
      // Provide the required 'receive' method
      receive(from, operation, data) {
        //console.log("END POINT RX PROCESSING... ("+from+", "+operation+")", data);
        switch (operation) {
        case 'CALL_REQUEST':
        case 'REQ_CALL':
          this.requestIncomingCall(from, data);
          break;
        case 'DENIED':
          this.callDenied(from, data);
          break;
        case 'CALL_ACCEPT':
        case 'ACCEPT':
          this.callAccepted(from, data);
          break;
        case 'OFFER':
        case 'SDP_OFFER':
          this.receivedIncomingSDPoffer(from, data);
          break;
        case 'ANSWER':
        case 'SDP_ANSWER':
          this.receivedIncomingSDPanswer(from, data);
          break;
        case 'CANDIDATE':
          this.receivedCandidate(from, data);
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
      createPeerConnection(from) {
        var videoWrap = document.querySelector('#'+this._name);
        var videoTag = videoWrap.querySelector('.video');

        // Create a peer connector for our end of this conversation
        var pc = this.peerConnector = new RTCPeerConnection();
        console.log("RECEIVING PEER CREATED");
        pc.onicecandidate = (e) => {
          console.log("HAVE ICE CANDIDATE (RX): ", e);
          if (e.candidate!=null)
            this.send(from, "CANDIDATE", e.candidate);
          else
            console.log("NOT SENDING EMPTY CANDIDATE");
        };
        pc.onaddstream = (e) => {
          console.log('Received remote stream fo: ', this._name);
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
      /** @method requestIncomingCall
       *  @description incoming call request handler. If this EndPoint is IDLE then we accept the call
       *   and reply with 'CALL_ACCEPT'. If we're already busy then reject the call by sending 'DENIED'.
       *
       *   If the call is accepted we create our local peer connection ready for the remote end and then
       *   set our state to 'RX' (receiving a call).
       */
      requestIncomingCall(from) {
        // Only accept a call if we're currently idle
        console.log("NAME: "+this._name+" REQUESTING INCOMING CALL FROM: "+from);
        if (this._state!='IDLE')
          this.send(from, 'DENIED');
        else {
          this._state = 'RX';
          this.party = from;

          this.createPeerConnection(from);

          this.send(from, 'CALL_ACCEPT');
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
        console.log("NAME: "+this._name+" CALL ACCEPTED: "+from);

        this._state = 'TX';

        // And then give the transmitting stream the ones we have
        this.createPeerConnection(from).then((pc) => {
          console.log('PeerConnector (TX) createOffer start');
          var offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
          };
          pc.createOffer(
            offerOptions
          ).then(
            (offer) => {
              console.log("WE HAVE AN OFFER...",offer);

              // Give the offer description to our end of the connector
              pc.setLocalDescription(offer);

              // Send the offer to the remote end of the peer connector
              this.send(from, "OFFER", offer );
            },
            onCreateSessionDescriptionError
          );
        });
      }
      /** @method callDenied
       *  @description Response from the remote EndPoint to our CALL_REQ method declining our invitation. In this
       *  implementation the only reason we decline a call is if we are already on another call.
       */
      callDenied(from) {
        console.log("NAME: "+this._name+" CALL DENIED: "+from);
        alert("Can't call "+from+", the line is busy...");
      }
      /** @method receivedIncomingSDPoffer
       *  @description Process an incoming SDP offer. This is ignored if we're not currently the receiving party in a
       *  call. We store the description as our remote description and then create an SDP answer which we store
       *  as our local description then send back to the instigator of the call with the 'ANSWER' method.
       */
      receivedIncomingSDPoffer(from, data) {
        console.log("PROCESSING INCOMING SDP OFFER...");
        if (this._state=='RX') {
          console.log("Accepting incoming offer...", data);
          this.peerConnector.setRemoteDescription(data).then(
            () => console.log("setRemoteDescription COMPLETE"),
            () => console.log("setRemoteDescription FAILED")
          );
          // And generate an answering offer
          this.peerConnector.createAnswer().then(
            (desc) => {
              console.log('Answer from RECEIVER {'+this._name+'}:\n' + desc.sdp);
              this.peerConnector.setLocalDescription(desc);

              // And send this to desciption to the remote end
              this.send(from, "ANSWER", desc);
            },
            onCreateSessionDescriptionError
          );
        }
      }
      /** @method receivedIncomingSDPoffer
       *  @description We've sent and SDP description to the EndPoint we're calling and this is the answer to that
       *  offer. We store this as out remote description.
       */
      receivedIncomingSDPanswer(from, data) {
        console.log("PROCESSING INCOMING SDP ANSWER...");
        if (this._state=='TX') {
          console.log("Accepting incoming offer...", data);
          this.peerConnector.setRemoteDescription(data).then(
            () => console.log("setRemoteDescription COMPLETE"),
            () => console.log("setRemoteDescription FAILED")
          );
        }
      }
      /** @method receivedCandidate
       *  @description An serialised ICE candidate has been received. There can be multiple ICE candidates per call. Each needs to be
       *  restored by creating a new RTCIceCandidate object and then giving that to the calls peer connection object.
       */
      receivedCandidate(from, data) {
        if (this._state!='IDLE') {
          console.log("PROCESSING INCOMING CANDIDATE FOR: "+this._name, data);
          var candidate = new RTCIceCandidate(data);
          console.log("CREATED CANDIDATE: ", candidate);
          console.log("PEER CONNETOR: ",this.peerConnector);
          this.peerConnector.addIceCandidate(candidate)
          .then(
            () => {console.log("Found ICE candidates",this.peerConnector);},
            (err) => {
              console.log('===============================================================');
              console.log("ERROR: Can't Find ICE candidates",err,this.peerConnector);
            }
          );
        }
      }
      /** @method endCall
       *  @description Called to close the local end of a call. Can be called directly if it's our end
       *  or as the result of a remote method invocation.
       */
      endCall(/* from, data */) {
        /* RECIEVED AN ENDCALL FROM REMOTE STATION */
        if ((this._state=='RX' || this._state=='TX') && this.peerConnector!=null) {
          this.peerConnector.close();
          delete this.peerConnector;
          this._state = 'IDLE';

          // Find my video tag (self) and close.
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
        if ((this._state=='RX' || this._state=='TX') && this.peerConnector!=null) {
          this.endCall();

          // Tell the other end
          this.send(this.party, 'END_CALL');
        }
      }
      /** @method startCall
       *  @description The user wants to make a call to a remote EndPoint (target). This first part of the process
       *  is to send a message to the target to request the call. The remote EndPoint may accept the call by sending
       *  'CALL_ACCEPT' or decline the call by sending 'DENIED'. Nothing happens at our end other than to send the
       *  message requesting the call. The actuall call is set up if the remote station accepts and sends 'CALL_ACCEPT'.
       *
       *  If the local EndPoint (this) is already in a call (_state is NOT IDLE) then we refuse to start another call.
       *  @param {String} target - the name of the remote party that we want to start a call with
       */
      startCall(target) {
        if (this._state=='IDLE') {
          this.send(target, 'REQ_CALL');
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
            console.log("GOT STREAM TO PAUSE");
            media.getTracks().forEach((track) => {
              console.log("TOGGLING TRACK STATE: ",track);
              track.enabled = !track.enabled;
            });
          });
          // tag.srcObject.getTracks().forEach(t => t.enabled = !t.enabled);
        }
      }
    }

    // Create four end points, one for out sender and one for our receiver.
    new VideoEndPoint('V1');
    new VideoEndPoint('V2');
    new VideoEndPoint('V3');
    new VideoEndPoint('V4');

    function onCreateSessionDescriptionError(error) {
      console.log('===============================================================');
      console.log('Failed to create session description: ' + error.toString());
    }

    /**** Utility DOM functions ****/
    function getCurrentTarget(ev) {
      return ev.currentTarget.parentElement;
    }
    function endPointFromEvent(ev) {
      return EndPoint.get(ev.currentTarget.parentElement.getAttribute('id'));
    }

    /**** Button Handlers ****/
    function endCall(ev) {
      // Get the EndPoint object from it's name
      endPointFromEvent(ev).hangupCall();
    }
    function pauseVideo(ev) {
      // Toggle pause state of the relevant video tag.
      endPointFromEvent(ev).pauseCall();
    }
    function startCall(ev) {
      // Ask the target whether we can call
      endPointFromEvent(ev)
         .startCall(getCurrentTarget(ev).querySelector('.target').value);
    }
    // Set up button handlers
    document.querySelectorAll('.startCall').forEach((elem) => {elem.addEventListener('click', startCall);});
    document.querySelectorAll('.endCall').forEach((elem) => {elem.addEventListener('click', endCall);});
    document.querySelectorAll('.pause').forEach((elem) => {elem.addEventListener('click', pauseVideo);});
  });
})();
