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
  });
})();
