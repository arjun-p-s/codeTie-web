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

  const [callAccepted, setCallAccepted] = useState(false);
  const [callState, setCallState] = useState(isCaller ? "outgoing" : "active");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

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

  // Handle call response and setup
  useEffect(() => {
    if (!isCaller) {
      init(); // Receiver initializes immediately
    }

    socket.on("callResponse", ({ response, roomId: incomingRoomId }) => {
      if (incomingRoomId === roomId && response === "accepted") {
        setCallAccepted(true);
      } else if (response === "declined") {
        setCallState("ended");
      }
    });

    return () => {
      cleanup();
      socket.off("callResponse");
    };
  }, []);

  useEffect(() => {
    if (isCaller && callAccepted) {
      init(); // Caller waits until call is accepted
    }
  }, [callAccepted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const init = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localRef.current.srcObject = stream;
      localStream.current = stream;

      createPeerConnection();
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      setupSocketEvents();
      socket.emit("joinVideoRoom", { roomId });
    } catch (error) {
      console.error("Media error:", error);
    }
  };

  const createPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnection.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { candidate: e.candidate, roomId });
      }
    };

    peerConnection.current.ontrack = (e) => {
      if (remoteRef.current && e.streams[0]) {
        remoteRef.current.srcObject = e.streams[0];
        setCallState("active");
      }
    };
  };

  const setupSocketEvents = () => {
    socket.on("other-user-in-room", () => {
      createAndSendOffer();
    });

    socket.on("user-joined-video", () => {
      createAndSendOffer();
    });

    socket.on("video-offer", async ({ offer }) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("video-answer", { answer, roomId });
    });

    socket.on("video-answer", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });

    socket.on("user-left-video", () => {
      setCallState("ended");
    });
  };

  const createAndSendOffer = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("video-offer", { offer, roomId });
  };

  const cleanup = () => {
    socket.emit("leaveVideoRoom", { roomId });
    socket.off("video-offer");
    socket.off("video-answer");
    socket.off("ice-candidate");
    socket.off("user-left-video");

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  const endCall = () => {
    setCallState("ended");
    setTimeout(() => navigate(-1), 2000);
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
          <p className="text-green-100 mb-8">Room: {roomId}</p>
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
              <div className="text-xs text-gray-400">Encrypted</div>
            </div>
          </div>
          <div className="text-sm">Room: {roomId?.slice(-6)}</div>
        </div>

        <div className="flex-1 relative">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

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
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full ${
              isMuted ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full ${
              isVideoOff ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center`}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button
            onClick={endCall}
            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center"
          >
            <PhoneOff size={20} />
          </button>
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-12 h-12 rounded-full ${
              !isSpeakerOn ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center`}
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
          className="px-6 py-2 bg-green-500 rounded-full hover:bg-green-600"
        >
          Back
        </button>
      </div>
    );
  }

  return null;
};

export default VideoCall;
