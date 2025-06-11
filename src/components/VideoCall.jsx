import  { useEffect, useRef } from "react";
import io from "socket.io-client";
import PropTypes from "prop-types";

const socket = io("http://localhost:5173");

const VideoCall = ({ roomId }) => {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    // Join the room
    socket.emit("joinVideoRoom", { roomId });

    // Get media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localRef.current.srcObject = stream;
      localStream.current = stream;

      createPeerConnection();

      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Automatically create offer for first participant
      socket.emit("ready", { roomId });
    });

    // When other user is ready
    socket.on("ready", async () => {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("video-offer", { offer, roomId });
    });

    // Receive offer
    socket.on("video-offer", async ({ offer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("video-answer", { answer, roomId });
    });

    // Receive answer
    socket.on("video-answer", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE candidate
    socket.on("ice-candidate", ({ candidate }) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [roomId]);

  // Setup PeerConnection
  const createPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, roomId });
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteRef.current.srcObject = event.streams[0];
    };
  };

  return (
    <div className="relative w-full h-screen bg-black flex justify-center items-center">
      <video ref={remoteRef} autoPlay className="w-full h-full object-cover" />
      <video
        ref={localRef}
        autoPlay
        muted
        className="absolute top-4 right-4 w-24 h-32 rounded border-2 border-white"
      />
    </div>
  );
};

VideoCall.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default VideoCall;
