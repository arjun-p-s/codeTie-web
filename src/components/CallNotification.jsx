import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const CallNotification = ({ currentUserId, currentUserName }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for incoming calls
    socket.on("incomingCall", ({ callerName, callType, roomId, callerId }) => {
      const callInfo = { callerName, callType, roomId, callerId };
      setIncomingCall(callInfo);
      setIsVisible(true);

      // Auto-decline after 30s
      setTimeout(() => {
        setIsVisible(false);
        setIncomingCall(null);
        socket.emit("respondToCall", {
          callerId,
          response: "declined",
          roomId,
        });
      }, 30000);
    });

    // Listen for call responses
    socket.on("callResponse", ({ response, roomId, responderId }) => {
      console.log("📞 Call response:", response);

      if (response === "accepted") {
        // Navigate to video call
        navigate(`/videoCall/${roomId}`, {
          state: { isCaller: true },
        });
      } else {
        // Handle declined call
        alert("Call was declined");
      }
    });

    socket.on("callNotificationSent", ({ targetUserId }) => {
      console.log("📞 Call notification sent to:", targetUserId);
    });

    socket.on("callNotificationFailed", ({ targetUserId, reason }) => {
      console.log("📞 Call notification failed:", reason);
      alert(`Failed to call user: ${reason}`);
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callResponse");
      socket.off("callNotificationSent");
      socket.off("callNotificationFailed");
    };
  }, [navigate, incomingCall]);

  const acceptCall = () => {
    if (incomingCall) {
      socket.emit("respondToCall", {
        callerId: incomingCall.callerId,
        response: "accepted",
        roomId: incomingCall.roomId,
      });

      setIsVisible(false);
      setIncomingCall(null);

      // Navigate to video call
      navigate(`/videoCall/${incomingCall.roomId}`, {
        state: { isCaller: false },
      });
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      socket.emit("respondToCall", {
        callerId: incomingCall.callerId,
        response: "declined",
        roomId: incomingCall.roomId,
      });
    }

    setIsVisible(false);
    setIncomingCall(null);
  };

  // Function to initiate a call (call this from your chat/contact interface)
  const initiateCall = (targetUserId, targetUserName, callType = "video") => {
    const roomId = [currentUserId, targetUserId].sort().join("_");

    socket.emit("sendCallNotification", {
      targetUserId,
      callerId: currentUserId,
      callerName: currentUserName,
      callType,
      roomId,
    });

    // ✅ Do NOT navigate here.
  };

  if (!isVisible || !incomingCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl text-white">
              {incomingCall.callType === "video" ? "📹" : "📞"}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Incoming {incomingCall.callType} call
          </h3>
          <p className="text-gray-600 mt-1">{incomingCall.callerName}</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={declineCall}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">❌</span>
            Decline
          </button>
          <button
            onClick={acceptCall}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">✅</span>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// Example usage component
const ChatInterface = ({
  currentUserId,
  currentUserName,
  targetUserId,
  targetUserName,
}) => {
  const initiateVideoCall = () => {
    const roomId = [currentUserId, targetUserId].sort().join("_");

    socket.emit("sendCallNotification", {
      targetUserId,
      callerName: currentUserName,
      callType: "video",
      roomId,
    });

    // Navigate to call immediately
    window.location.href = `/videoCall/${roomId}`;
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">{targetUserName}</h2>
        <button
          onClick={initiateVideoCall}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
        >
          📹 Video Call
        </button>
      </div>

      {/* Your chat messages here */}
      <div className="chat-messages">{/* Chat content */}</div>
    </div>
  );
};

export { CallNotification, ChatInterface };
