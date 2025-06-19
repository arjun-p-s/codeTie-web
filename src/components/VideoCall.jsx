import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

// Fix: Connect to your backend server, not frontend port
const socket = io("http://localhost:5000"); // Change this to your backend server port

const VideoCall = () => {
  const { roomId } = useParams();
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);

  useEffect(() => {
    console.log("🎥 VideoCall component mounted, room:", roomId);

    // Initialize everything
    initializeVideoCall();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [roomId]);

  const initializeVideoCall = async () => {
    try {
      // 1. Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("📹 Got local stream");
      if (localRef.current) {
        localRef.current.srcObject = stream;
      }
      localStream.current = stream;

      // 2. Create peer connection
      createPeerConnection();

      // 3. Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
        console.log("➕ Added track to peer connection");
      });

      // 4. Setup socket listeners BEFORE joining room
      setupSocketListeners();

      // 5. Join the room
      socket.emit("joinVideoRoom", { roomId });
      setIsConnected(true);

    } catch (error) {
      console.error("❌ Error initializing video call:", error);
    }
  };

  const createPeerConnection = () => {
    console.log("🔗 Creating peer connection");

    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 Sending ICE candidate");
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          roomId,
        });
      }
    };

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log("🎥 Received remote stream");
      if (remoteRef.current && event.streams[0]) {
        remoteRef.current.srcObject = event.streams[0];
        setIsCallStarted(true);
      }
    };

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      console.log(
        "🔗 Connection state:",
        peerConnection.current.connectionState
      );
    };

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log(
        "🧊 ICE connection state:",
        peerConnection.current.iceConnectionState
      );
    };
  };

  const setupSocketListeners = () => {
    // When there are other users already in room
    socket.on("other-user-in-room", async (data) => {
      console.log("👥 Other users already in room:", data.numUsers);
      setIsInitiator(true);
      // Wait a bit for everything to be ready
      setTimeout(() => {
        createOffer();
      }, 1000);
    });

    // When a new user joins (we're already in room)
    socket.on("user-joined-video", async (data) => {
      console.log("👤 New user joined video room:", data.userId);
      if (!isInitiator) {
        setIsInitiator(true);
        // Wait a bit for the other user to be ready
        setTimeout(() => {
          createOffer();
        }, 1000);
      }
    });

    // Receive video offer
    socket.on("video-offer", async ({ offer, from }) => {
      console.log("📥 Received offer from:", from);

      try {
        if (peerConnection.current.signalingState === "stable") {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);

          socket.emit("video-answer", { answer, roomId });
          console.log("📤 Sent answer");
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    });

    // Receive video answer
    socket.on("video-answer", async ({ answer, from }) => {
      console.log("📥 Received answer from:", from);

      try {
        if (peerConnection.current.signalingState === "have-local-offer") {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("✅ Set remote description from answer");
        }
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    });

    // Receive ICE candidates
    socket.on("ice-candidate", async ({ candidate, from }) => {
      console.log("📥 Received ICE candidate from:", from);

      try {
        if (peerConnection.current && 
            peerConnection.current.remoteDescription && 
            candidate) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("✅ Added ICE candidate");
        }
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    });

    // Handle user leaving
    socket.on("user-left-video", ({ userId }) => {
      console.log("👋 User left:", userId);
      if (remoteRef.current) {
        remoteRef.current.srcObject = null;
      }
      setIsCallStarted(false);
      setIsInitiator(false);
    });
  };

  const createOffer = async () => {
    try {
      if (peerConnection.current.signalingState === "stable") {
        console.log("📤 Creating offer");
        const offer = await peerConnection.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("video-offer", { offer, roomId });
        console.log("📤 Sent offer");
      }
    } catch (error) {
      console.error("❌ Error creating offer:", error);
    }
  };

  const cleanup = () => {
    console.log("🧹 Cleaning up video call");

    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    // Leave room
    socket.emit("leaveVideoRoom", { roomId });

    // Remove socket listeners
    socket.off("other-user-in-room");
    socket.off("user-joined-video");
    socket.off("video-offer");
    socket.off("video-answer");
    socket.off("ice-candidate");
    socket.off("user-left-video");
  };

  const endCall = () => {
    cleanup();
    // Navigate back or handle end call logic
    window.history.back();
  };

  return (
    <div className="h-screen bg-black flex flex-col p-5">
      <div className="flex justify-between items-center mb-5 text-white">
        <h2 className="text-xl font-bold">Video Call - Room: {roomId}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Status:{" "}
            {isConnected
              ? isCallStarted
                ? "🟢 Connected"
                : "🟡 Waiting..."
              : "🔴 Connecting..."}
          </span>
          <button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white border-none rounded px-5 py-2 cursor-pointer transition-colors"
          >
            End Call
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-5">
        {/* Local Video */}
        <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-70 px-2 py-1 rounded text-sm">
            You
          </div>
        </div>

        {/* Remote Video */}
        <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-70 px-2 py-1 rounded text-sm">
            {isCallStarted ? "Remote User" : "Waiting for user..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;