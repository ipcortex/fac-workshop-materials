# FAC WebRTC Workshop

1. Configure simple HTTPS server to serve scripts
2. Using streams locally  
Create a <video> tag in a static page  
Request media (camera and microphone)  
Attach media to video tag
3. Local Peer Connection and Signalling
4. Using streams between devices over a network
5. _Building a simple remote 'Presentation' application using WebRTC_

## Configure HTTPS Server

This has been done for you. Please clone this repo to use the boilerplate that has been provided.

If you would like to recap how this is done, see [this description] // Put link here

## Using streams locally
+ Request local media stream (video/audio)
+ Attach to browser <video> tag

## 1. Local media streams
```javascript
var promise = navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

promise.then((avStream) => {
  // Find my video tag...
  video = document.createElement('video');
  attachMediaStream(video, stream);
  video.play();

  // Add video tag to DOM
  videoContainer.append(v);
}).catch(() => {...})
```

## 2. Local Peer Connection
+ Connecting camera/mic to a local video tag THROUGH a peer connector
+ Implement our own local signalling
+ Shows the basic structure of how to connect streams to each other remotely without network complexity

## 3. Local signaling
+ Create a 'signaling' abstraction:
  + Announce (me), send (to), listen
  + Completely local

Single web page!

## 4. Remote Peer Connections
+ Replace local signaling with node server proxy
+ Options for transferring signaling:
  + AJAZ Poller
  + Web Socket

## 4. Signaling across a network
+ Split your signaling into two parts:
  + Carry information across the local network
  + Modify the application to have one end point per browser

## 5. Remote Presentations
1. Announce presentation -> Presentations Server
2. Student joins presentation
3. Student & mentor negotiate session -> Signaling server
4. Mentor sends A/V Real-time stream

**Either** using IP Cortex API **or** modified signaling from previous task

## Signaling for Remote Presentations: Two Options
+ Evolution of simple signaling from previous example
  + Should work on a local LAN
  + Won't work across the Internet without TURN/STUN servers (complexity)
+ IP Cortex API
  + Covers all the routing across the Internet
  + More complex to configure/run

## References
+ MDN WebRTC
  + https://developer/mozilla.org/en-US/docs/Web/API/WebRTC_API
+ WebRTC.org - Getting Started
  + https://webrtc.org/start/
+ HTML 5 Rocks - Getting started with WebRTC (2012)
  + Good overview
  + Illustrates local signaling _but_ is not a portable way
  + https://www.html5rocks.com/en/tutorials/webrtc/basics/
+ HTML 5 Rocks - WebRTC Infastructure
  + Great overview of signaling - everything you need to know!
  + https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/
+ adapter.js
  + Shim to isolate applications from browser incompatibilities
  + https://github.com/webrtc/adapter
