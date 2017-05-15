/* global document */
(function() {
  document.addEventListener("DOMContentLoaded", function() {
    // Create four end points, one for out sender and one for our receiver.
    var localEndPoint;

    /**** Utility DOM functions ****/
    function getCurrentTarget(ev) {
      return ev.currentTarget.parentElement;
    }
    function endPointFromEvent(ev) {
      return localEndPoint;
      // return EndPoint.get(ev.currentTarget.parentElement.getAttribute('id'));
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
    function startSystem() {
      // Get the name. If it's valid THEN create a video end point and display the controls.
      var myname = document.querySelector('.myname').value;
      if (myname==null || myname.search(/\S/)<0) {
        alert("Enter a name to proceed");
        return;
      }
      // Have a name - hide the start controls and show the video call information.
      var ctrl = document.getElementById('identity');
      if (ctrl!=null)
        ctrl.classList.add('hidden');

      ctrl = document.getElementById('videocontrols');
      if (ctrl!=null) {
        ctrl.classList.remove('hidden');

        // And change the ID of this element to be the name currently entered
        ctrl.setAttribute('id',myname);
      }
      localEndPoint = new VideoEndPoint(
        myname,
        document.querySelector('#videowrap .remoteVideo'),
        document.querySelector('#videowrap .localVideo')
      );
    }
    // Set up button handlers
    document.querySelectorAll('.startCall').forEach((elem) => {elem.addEventListener('click', startCall);});
    document.querySelectorAll('.endCall').forEach((elem) => {elem.addEventListener('click', endCall);});
    document.querySelectorAll('.pause').forEach((elem) => {elem.addEventListener('click', pauseVideo);});
    document.querySelector('.initialise').addEventListener('click', startSystem);
  });
})();
