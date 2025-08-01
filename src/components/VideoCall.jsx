import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  MoreVertical,
} from "lucide-react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const VideoCall = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCaller = location.state?.isCaller ?? false;

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const [callState, setCallState] = useState(isCaller ? "outgoing" : "active");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Timer
  useEffect(() => {
    let timer;
    if (callState === "active") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Initialize call setup
  useEffect(() => {
    init();

    // Handle call response for caller
    if (isCaller) {
      socket.on("callResponse", ({ response, roomId: incomingRoomId }) => {
        if (incomingRoomId === roomId) {
          if (response === "accepted") {
            console.log("Call accepted, transitioning to active state");
            setCallState("active");
          } else if (response === "declined") {
            setCallState("ended");
          }
        }
      });
    }

    return () => {
      cleanup();
      socket.off("callResponse");
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const init = async () => {
    try {
      console.log("Initializing video call...");
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      console.log("Got local stream:", stream);
      
      if (localRef.current) {
        localRef.current.srcObject = stream;
      }
      localStream.current = stream;

      // Create peer connection AFTER getting stream
      createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection:", track.kind);
        peerConnection.current.addTrack(track, stream);
      });

      setupSocketEvents();
      
      // Join the video room
      console.log("Joining video room:", roomId);
      socket.emit("joinVideoRoom", { roomId, userId: socket.id });
      
    } catch (error) {
      console.error("Media error:", error);
      alert("Could not access camera/microphone. Please check permissions.");
      setCallState("ended");
    }
  };

  const createPeerConnection = () => {
    console.log("Creating peer connection...");
    
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit("ice-candidate", { 
          candidate: event.candidate, 
          roomId 
        });
      }
    };

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0]);
      
      if (remoteRef.current && event.streams[0]) {
        remoteRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setCallState("active");
      }
    };

    // Connection state monitoring
    peerConnection.current.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnection.current.connectionState);
      
      if (peerConnection.current.connectionState === "connected") {
        setIsConnected(true);
        setCallState("active");
      } else if (peerConnection.current.connectionState === "failed") {
        console.error("WebRTC connection failed");
        setCallState("ended");
      }
    };

    // ICE connection state monitoring
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peerConnection.current.iceConnectionState);
    };
  };

  const setupSocketEvents = () => {
    // When another user joins the room
    socket.on("user-joined-video", ({ userId: joinedUserId }) => {
      console.log("User joined video room:", joinedUserId);
      // Create and send offer if we're the first user
      setTimeout(() => createAndSendOffer(), 1000);
    });

    // When we're told there are other users in room
    socket.on("other-user-in-room", ({ numUsers }) => {
      console.log("Other users in room:", numUsers);
      // Create and send offer
      setTimeout(() => createAndSendOffer(), 1000);
    });

    // Handle incoming video offer
    socket.on("video-offer", async ({ offer, from }) => {
      console.log("Received video offer from:", from);
      
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        console.log("Sending video answer");
        socket.emit("video-answer", { answer, roomId });
        
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    // Handle incoming video answer
    socket.on("video-answer", async ({ answer, from }) => {
      console.log("Received video answer from:", from);
      
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    });

    // Handle ICE candidates
    socket.on("ice-candidate", async ({ candidate, from }) => {
      console.log("Received ICE candidate from:", from);
      
      try {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    // Handle user leaving
    socket.on("user-left-video", ({ userId }) => {
      console.log("User left video room:", userId);
      if (remoteRef.current) {
        remoteRef.current.srcObject = null;
      }
      setIsConnected(false);
      setCallState("ended");
    });

    // Handle call ended by user
    socket.on("callEndedByUser", ({ endedBy }) => {
      console.log("Call ended by user:", endedBy);
      setCallState("ended");
    });
  };

  const createAndSendOffer = async () => {
    try {
      console.log("Creating and sending offer...");
      
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await peerConnection.current.setLocalDescription(offer);
      
      console.log("Sending offer to room:", roomId);
      socket.emit("video-offer", { offer, roomId });
      
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const cleanup = () => {
    console.log("Cleaning up video call...");
    
    socket.emit("leaveVideoRoom", { roomId });
    
    socket.off("video-offer");
    socket.off("video-answer");
    socket.off("ice-candidate");
    socket.off("user-left-video");
    socket.off("other-user-in-room");
    socket.off("user-joined-video");
    socket.off("callEndedByUser");

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  const endCall = () => {
    console.log("Ending call...");
    socket.emit("endCallForAll", { roomId });
    setCallState("ended");
    setTimeout(() => navigate(-1), 2000);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // This was wrong - should be !isMuted
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff; // This was wrong - should be !isVideoOff
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  if (callState === "outgoing") {
    return (
      <div className="h-screen bg-gradient-to-br from-green-600 to-green-800 flex flex-col justify-center items-center text-white relative">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              U
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Calling user...</h2>
          <p className="text-green-100 mb-4">Connecting...</p>
          <p className="text-green-100 mb-8 text-sm">Room: {roomId?.slice(-6)}</p>
          
          {/* Show local video preview during outgoing call */}
          <div className="w-48 h-36 bg-gray-900 rounded-lg overflow-hidden mb-6 mx-auto">
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          
          <button
            onClick={endCall}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (callState === "active") {
    return (
      <div className="w-full h-screen bg-black flex flex-col">
        <div className="p-4 text-white flex justify-between bg-black/70">
          <div className="flex items-center space-x-4">
            <MoreVertical />
            <div>
              <div className="text-sm">{formatTime(callDuration)}</div>
              <div className="text-xs text-gray-400">
                {isConnected ? "Connected" : "Connecting..."}
              </div>
            </div>
          </div>
          <div className="text-sm">Room: {roomId?.slice(-6)}</div>
        </div>

        <div className="flex-1 relative bg-gray-900">
          {/* Remote video (main area) */}
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ backgroundColor: '#1f2937' }}
          />
          
          {/* Show message if no remote video */}
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Video size={24} />
                </div>
                <p>Waiting for other participant...</p>
              </div>
            </div>
          )}

          {/* Local video (small window) */}
          <div className="absolute top-6 right-6 w-32 h-44 bg-gray-900 border-white/20 border-2 rounded-xl overflow-hidden shadow-lg">
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="p-6 bg-black/70 flex justify-center space-x-4 text-white">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full ${
              isMuted ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center transition-colors`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full ${
              isVideoOff ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center transition-colors`}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button
            onClick={endCall}
            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
          >
            <PhoneOff size={20} />
          </button>
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-12 h-12 rounded-full ${
              !isSpeakerOn ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center transition-colors`}
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>
    );
  }

  if (callState === "ended") {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-700 to-gray-900">
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4">
          <PhoneOff size={32} />
        </div>
        <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
        <p className="text-gray-300 mb-4">
          Duration: {formatTime(callDuration)}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
        >
          Back to Chat
        </button>
      </div>
    );
  }

  return null;
};

export default VideoCall;