/* global document, EndPoint, VideoEndPoint */
    // Application logic here

    const V1RemoteVideoTag = document.querySelector('#V1 .remoteVideo');
    const V2RemoteVideoTag = document.querySelector('#V2 .remoteVideo');
    const V3RemoteVideoTag = document.querySelector('#V3 .remoteVideo');
    const V4RemoteVideoTag = document.querySelector('#V4 .remoteVideo');

    const V1LocalVideoTag = document.querySelector('#V1 .localVideo');
    const V2LocalVideoTag = document.querySelector('#V2 .localVideo');
    const V3LocalVideoTag = document.querySelector('#V3 .localVideo');
    const V4LocalVideoTag = document.querySelector('#V4 .localVideo');

    const V1StateTag = document.querySelector('#V1 .state');
    const V2StateTag = document.querySelector('#V2 .state');
    const V3StateTag = document.querySelector('#V3 .state');
    const V4StateTag = document.querySelector('#V4 .state');

    const V1 = new VideoEndPoint('V1', V1RemoteVideoTag, V1LocalVideoTag, V1StateTag);
    const V2 = new VideoEndPoint('V2', V2RemoteVideoTag, V2LocalVideoTag, V2StateTag);
    const V3 = new VideoEndPoint('V3', V3RemoteVideoTag, V3LocalVideoTag, V3StateTag);
    const V4 = new VideoEndPoint('V4', V4RemoteVideoTag, V4LocalVideoTag, V4StateTag);

    const callBtns = document.querySelectorAll('.startCall');
    const hangUpBtns = document.querySelectorAll('.endCall');
    const remoteVideoTags = document.querySelectorAll('.remoteVideo');
    const localVideoTags = document.querySelectorAll('.localVideo');

    const getInput = (button) => {
      return button.parentElement.querySelector('.target').value;
    };

    const getCallerId = (button) => {
      return button.parentElement.id;
    };

    callBtns.forEach((button)=>{
      button.addEventListener('click', ()=>{
        const callTargetName = getInput(button);
        const callerId = getCallerId(button);
        // console.log(callTargetName);
        EndPoint.names[callerId].makeCall(callTargetName, 'Hi Oli');
      });
    });

    hangUpBtns.forEach((button)=>{
      button.addEventListener('click', ()=>{
        const callTargetName = getInput(button);
        const callerId = getCallerId(button);
      });
    });

    // V1.send('V2', 'SDP_ANSWER', {a: 'yo'});

    // const videoTag = document.getElementById('videoTag');

  //   if (videoTag) {
  //     navigator.mediaDevices.getUserMedia({audio: true, video: true})
  // .then(function (mediaStream) {
  //   videoTag.srcObject = mediaStream;
  // })
  // .catch(function (err) {
  //   console.log('video not working', err);
  // });
  //   }
