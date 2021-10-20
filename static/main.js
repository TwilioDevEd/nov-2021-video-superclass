window.addEventListener("load", () => {
  // initialize number of participants with local video.
  // we can have a max of six participants.
  let availableYarn = [1, 2, 3, 4, 5, 6];

  // element identifiers
  const startDiv = document.getElementById("start");
  const identityInput = document.getElementById("identity");
  const joinButton = document.getElementById("join");

  async function addBackgroundBlur() {
    // create a local video track
    const videoTrack = await Twilio.Video.createLocalVideoTrack({
      width: 640,
      height: 480,
      frameRate: 24
    });

    // create a background blur video processor. There's also a virtual background video processor,
    // or you can create your own processor.
    const bg = new Twilio.VideoProcessors.GaussianBlurBackgroundProcessor({
      // the static assets are required for Twilio Video Processors to format the video background.
      // These are located in the static/ folder of this project. You can retrieve them from the Video Processors
      // library when you npm install the library or download the code from GitHub
      // https://github.com/twilio/twilio-video-processors.js
      assetsPath: '../static',
      maskBlurRadius: 10,
      blurFilterRadius: 5,
    });
    await bg.loadModel();
    // add the processor to the video track
    videoTrack.addProcessor(bg);
    return videoTrack
  }

  // join the video room
  async function connect() {
    startDiv.style.display = "none";
    const response = await fetch("/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({"identity": identityInput.value})
    });
    const { token } = await response.json();
    videoTrack = await addBackgroundBlur();

    // you join the room slightly differently than in the other versions of
    // this repository. Here, you create the video tracks before joining the room,
    // with the addBackgroundBlur function. Then, you pass that into the connect
    // method as the tracks option.
    // In other versions of this code, you join the room by saying
    // connect(token, {video: true, audio: false}). In this version, the tracks
    // are created automatically for you, rather than you needing to create them and
    // then pass them in. However, because you want to process the tracks beforehand
    // in this case and add a blur to them, you create the track first.
    const room = await Twilio.Video.connect(token, {
      tracks: [videoTrack]
    });

    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected", handleConnectedParticipant);

    // clean up when someone disconnects
    room.on("participantDisconnected", handleDisconnectedParticipant);
    window.addEventListener("pagehide", () => {room.disconnect()});
    window.addEventListener("beforeunload", () => {room.disconnect()});
  }

  function handleConnectedParticipant(participant) {
    findNextAvailableYarn(participant);

    participant.tracks.forEach((trackPublication) => {
      handleTrackPublished(trackPublication, participant);
    });
    participant.on("trackPublished", (trackPublication) => {
      handleTrackPublished(trackPublication, participant);
    });
  }

  function handleTrackPublished(trackPublication, participant) {
    const yarn = document.getElementById(`yarn-${participant.number}`);

    function handleTrackSubscribed(track) {
      yarn.appendChild(track.attach());
    }

    if (trackPublication.track) {
      handleTrackSubscribed(trackPublication.track);
    }
    trackPublication.on("subscribed", handleTrackSubscribed);
  }

  // tidy up helper function for when a participant disconnects
  // or closes the page
  function handleDisconnectedParticipant(participant) {
    participant.removeAllListeners();
    const el = document.getElementById(`yarn-${participant.number}`);
    el.innerHTML = "";
    availableYarn.push(participant.number);
  }

  // helper to find a spot on the page to display participant video
  function findNextAvailableYarn(participant) {
    const index = Math.floor(Math.random() * availableYarn.length);
    const choice = availableYarn[index];
    availableYarn = availableYarn.filter((e) => e != choice);
    participant.number = choice;
  }

  // event listeners
  joinButton.addEventListener("click", connect);
});
