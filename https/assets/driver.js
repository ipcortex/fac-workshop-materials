/* global document, EndPoint, VideoEndPoint */
(function() {
  document.addEventListener("DOMContentLoaded", function() {
    // Application logic here
    const V1 = new VideoEndPoint('V1');
    const V2 = new VideoEndPoint('V2');
    debugger;

    V1.send('V2', 'SDP_ANSWER', {a: 'yo'});

  });
})();
