import { useEffect, useState, useRef } from "react";
import { createSocketConnection } from "../utils/socket";
import { useParams } from "react-router";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import axios from "axios";
import dayjs from "dayjs";
import { Check, CheckCheck, Video, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Chat = () => {
  const { targetUserId } = useParams();
  const user = useSelector((store) => store.user);
  const userId = user?._id;

  const [incomingCall, setIncomingCall] = useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [targetUser, setTargetUser] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const finalRoomId = [userId, targetUserId].sort().join("_");

  const fetchMessages = async () => {
    try {
      const chat = await axios.get(BASE_URL + "chat/" + targetUserId, {
        withCredentials: true,
      });
      console.log(chat.data.messages);

      const chatMessages = chat?.data?.messages.map((msg) => {
        return {
          senderId: msg.senderId._id,
          firstName: msg.senderId.firstName,
          lastName: msg.senderId.lastName,
          text: msg.text,
          timestamp: msg.updatedAt,
          isSeen: msg.isSeen,
        };
      });
      setMessages(chatMessages);
    } catch (err) {
      console.log(err.message);
    }
  };
  const navigate = useNavigate();

  const handleStartCall = () => {
    const roomId = [userId, targetUserId].sort().join("_");

    socketRef.current.emit("sendCallNotification", {
      callerId: userId,
      callerName: user?.firstName,
      targetUserId,
      callType: "video",
      roomId,
    });

    const handleCallResponse = ({ response, roomId: responseRoomId }) => {
      // Make sure we're handling the right room response
      if (responseRoomId !== roomId) {
        console.warn("Received callResponse for unmatched room:", responseRoomId);
        return;
      }

      console.log("Call response received:", response, "for room:", responseRoomId);

      if (response === "accepted") {
        // Navigate to video call with caller state
        navigate(`/videoCall/${roomId}`, {
          state: { isCaller: false },
        });
      } else if (response === "declined") {
        alert("Call declined");
      }

      // Clean up listeners
      socketRef.current.off("callResponse", handleCallResponse);
      socketRef.current.off("callNotificationFailed", handleCallFailed);
    };

    const handleCallFailed = ({ reason }) => {
      alert("Call failed: " + reason);
      // Clean up listeners
      socketRef.current.off("callResponse", handleCallResponse);
      socketRef.current.off("callNotificationFailed", handleCallFailed);
    };

    // Set up listeners
    socketRef.current.once("callResponse", handleCallResponse);
    socketRef.current.once("callNotificationFailed", handleCallFailed);
  };

  useEffect(() => {
    if (!targetUserId) return;
    fetchMessages();
    fetch(BASE_URL + `profile/view/${targetUserId}`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setTargetUser(data))
      .catch((err) => console.error("Error fetching target user:", err));
  }, [targetUserId]);

  useEffect(() => {
    if (!userId || !targetUserId) {
      console.error("Error: Missing userId or targetUserId", {
        userId,
        targetUserId,
      });
      return;
    }

    const socket = createSocketConnection();
    socketRef.current = socket;

    socket.emit("userOnline", { userId });

    // Emit join event
    socket.emit("joinChat", {
      firstName: user?.firstName,
      userId,
      targetUserId,
    });

    // Mark messages seen
    socket.emit("markAsSeen", {
      userId,
      targetUserId,
    });

    // Handle message receiving
    socket.on("messageRecived", ({ firstName, text, timestamp, senderId }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          senderId,
          firstName,
          text,
          timestamp: timestamp || new Date().toISOString(),
          isSeen: false,
        },
      ]);
    });

    // Handle seen messages
    socket.on("messagesSeen", ({ by }) => {
      if (by === targetUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.firstName === user.firstName ? { ...msg, isSeen: true } : msg
          )
        );
      }
    });

    // ✅ Incoming call listener should be here
    socket.on("incomingCall", ({ callerName, callerId, callType, roomId }) => {
      setIncomingCall({ callerName, callerId, roomId });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, targetUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;

    const newMessage = {
      firstName: user?.firstName,
      text: message,
    };

    socketRef.current.emit("sendMessage", {
      ...newMessage,
      targetUserId,
      userId,
    });
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Chat Header */}
        <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              {/* Back Button - Mobile */}
              <button
                onClick={() => navigate(-1)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              
              {/* User Avatar */}
              <div className="relative">
                <img
                  src={targetUser?.userData?.photourl}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              {/* User Info */}
              <div>
                <h1 className="font-bold text-lg text-gray-800">
                  {targetUser?.userData?.firstName + " " + targetUser?.userData?.lastName || "Loading..."}
                </h1>
                <p className="text-sm text-gray-500">Active now</p>
              </div>
            </div>

            {/* Video Call Button */}
            <button
              onClick={handleStartCall}
              className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <Video size={20} />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.firstName === user.firstName ? "justify-end" : "justify-start"
              } mb-4`}
            >
              <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                msg.firstName === user.firstName ? "order-2" : "order-1"
              }`}>
                {/* Message Bubble */}
                <div className={`relative p-3 rounded-2xl shadow-md ${
                  msg.firstName === user.firstName
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-md"
                    : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                }`}>
                  <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  
                  {/* Message Meta */}
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    msg.firstName === user.firstName ? "text-white/80" : "text-gray-500"
                  }`}>
                    <span>{dayjs(msg.timestamp).format("hh:mm A")}</span>
                    {msg.firstName === user.firstName && (
                      <div className="flex items-center ml-2">
                        {msg.isSeen ? (
                          <CheckCheck size={14} className="text-white/90" />
                        ) : (
                          <Check size={14} className="text-white/60" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        {/* Message Input */}
        <div className="bg-white/80 backdrop-blur-md border-t border-white/20 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                type="text"
                placeholder="Type your message..."
                className=" text-gray-600 w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-auto transform animate-pulse">
            <div className="text-center">
              {/* Caller Avatar */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                <Video className="w-12 h-12 text-white" />
              </div>
              
              {/* Caller Info */}
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {incomingCall.callerName}
              </h3>
              <p className="text-gray-600 mb-6">Incoming video call...</p>
              
              {/* Call Actions */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    socketRef.current.emit("respondToCall", {
                      callerId: incomingCall.callerId,
                      response: "declined",
                      roomId: incomingCall.roomId,
                    });
                    setIncomingCall(null);
                  }}
                  className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <button
                  onClick={() => {
                    socketRef.current.emit("respondToCall", {
                      callerId: incomingCall.callerId,
                      response: "accepted",
                      roomId: incomingCall.roomId,
                    });
                    navigate(`/videoCall/${incomingCall.roomId}`);
                    setIncomingCall(null);
                  }}
                  className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  <Video className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;