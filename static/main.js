window.addEventListener("load", () => {
  // initialize number of participants with local video.
  // we can have a max of six participants.
  let availableYarn = [1, 2, 3, 4, 5, 6];

  // element identifiers
  const startDiv = document.getElementById("start");
  const identityInput = document.getElementById("identity");
  const joinButton = document.getElementById("join");

  // join the video room
  async function connect() {
    startDiv.style.display = "none";

    // fetch an access token from the server
    const response = await fetch("/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ identity: identityInput.value }),
    });
    const { token } = await response.json();
    // join the video room with the token. The token contains the
    // room name in it, so Twilio knows which one to connect to
    const room = await Twilio.Video.connect(token, {
      // whether to send data tracks -- defaults to true
      video: true,
      // whether to send audio tracks -- defaults to true, but this application
      // will disable audio for demonstration purposes
      audio: false,
    });

    // display video for the local participant and all other participants
    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected", handleConnectedParticipant);

    // clean up video page when someone disconnects
    room.on("participantDisconnected", handleDisconnectedParticipant);
    // disconnect from the room when someone closes the page
    window.addEventListener("pagehide", () => {
      room.disconnect();
    });
    window.addEventListener("beforeunload", () => {
      room.disconnect();
    });
  }

  function handleConnectedParticipant(participant) {
    // choose a random available yarn ball where the participant's video will show up
    findNextAvailableYarn(participant);
    // go through the participant's published tracks and attach any subscribed tracks to the page
    // note that these tracks are only video because when connecting to the room, only video
    // tracks were shared
    participant.tracks.forEach((trackPublication) => {
      handleTrackPublished(trackPublication, participant);
    });
    // listen for any new track publish events
    participant.on("trackPublished", (trackPublication) => {
      handleTrackPublished(trackPublication, participant);
    });
  }

  function handleTrackPublished(trackPublication, participant) {
    // identify the yarn ball where the track will go
    // the participant.number field was set earlier with the `findNextAvailableYarn` function
    const yarn = document.getElementById(`yarn-${participant.number}`);

    function handleTrackSubscribed(track) {
      // track.attach() renders the HTML element with track data in it
      // for a video track, it renders an HTML Video Element with the video data
      // received from the participant's video input (ex a camera)
      // Append this HTML element to the page
      yarn.appendChild(track.attach());
    }
    // only display the track if this participant is subscribed to it.
    // the TrackPublication will not have a `track` field if the participant is
    // not subscribed
    if (trackPublication.track) {
      handleTrackSubscribed(trackPublication.track);
    }
    // listen for any new subscription events for this publication
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

  // helper to find a random spot on the page to display participant video
  function findNextAvailableYarn(participant) {
    const index = Math.floor(Math.random() * availableYarn.length);
    const choice = availableYarn[index];
    availableYarn = availableYarn.filter((e) => e != choice);
    participant.number = choice;
  }

  // event listeners
  joinButton.addEventListener("click", connect);
});
