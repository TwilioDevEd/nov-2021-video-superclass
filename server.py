import os

import twilio.jwt.access_token
import twilio.jwt.access_token.grants
import twilio.rest
from dotenv import load_dotenv
from flask import Flask, render_template, request

# Create a Flask app
app = Flask(__name__)

# Load environment variables from a `.env` file
load_dotenv()

# Twilio client initialization
account_sid = os.environ["TWILIO_ACCOUNT_SID"]
api_key = os.environ["TWILIO_API_KEY"]
api_secret = os.environ["TWILIO_API_SECRET"]

# Room settings
ROOM_NAME = "Superclass!"
MAX_PARTICIPANTS = 6

twilio_client = twilio.rest.Client(api_key, api_secret, account_sid)


def find_or_create_room():
    """Find an existing Video Room, or create one if it doesn't exist."""
    try:
        # Try to fetch an in-progress Video room with the name that's the value of the global
        # ROOM_NAME variable
        room = twilio_client.video.rooms(ROOM_NAME).fetch()
    except twilio.base.exceptions.TwilioRestException:
        # If an in-progress room with the name we tried to fetch doesn't exist, create one
        room = twilio_client.video.rooms.create(
            unique_name=ROOM_NAME,
            # constrain the number of allowed participants
            max_participants=MAX_PARTICIPANTS,
            # use a group room (as opposed to `go` for WebRTC Go, or `p2p` for Peer rooms)
            type="group",
        )
    # Print how many participants the room has
    print(f"{room.unique_name} has {len(room.participants.list())} participants in it.")


@app.route("/")
def serve():
    """Render the homepage."""
    find_or_create_room()
    return render_template("index.html")


@app.route("/token", methods=["POST"])
def get_token():
    """Create and return an Access Token for a specific participant to join the video room"""
    # retrieve the participant's identity from the request's JSON payload
    identity = request.json.get("identity")
    # create an access token with your account credentials and the participant's identity
    access_token = twilio.jwt.access_token.AccessToken(
        account_sid, api_key, api_secret, identity=identity
    )
    # create a video grant that will allow access to this app's specific video room
    video_grant = twilio.jwt.access_token.grants.VideoGrant(room=ROOM_NAME)
    # Add the video grant to the access token
    access_token.add_grant(video_grant)
    # Turn the access token into a string and send it back as the response
    return {"token": access_token.to_jwt()}


# Start the server when we run this file
if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
