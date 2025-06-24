import { useEffect, useState, useRef } from "react";
import { createSocketConnection } from "../utils/socket";
import { useParams } from "react-router";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import axios from "axios";
import dayjs from "dayjs";
import { Check, CheckCheck, Video } from "lucide-react";
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

    const handleCallResponse = ({ response, roomId: responseRoom }) => {
      if (responseRoom !== roomId) return;

      if (response === "accepted") {
        navigate(`/videoCall/${roomId}`, {
          state: { isCaller: true },
        });
      } else if (response === "declined") {
        alert("Call declined");
      }

      socketRef.current.off("callResponse", handleCallResponse);
    };

    socketRef.current.on("callResponse", handleCallResponse);

    // ✅ NEW: Listen to failure
    socketRef.current.once("callNotificationFailed", ({ reason }) => {
      alert("Call failed: " + reason);
      socketRef.current.off("callResponse", handleCallResponse); // Clean up
    });
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

  return (
    <div className="flex justify-center">
      <div className="rounded-md p-5 m-10 border border-base-300 lg:w-1/2 w-full">
        <div className="avatar  flex items-center">
          <div className="w-8 rounded-full overflow-hidden">
            <img src={targetUser?.userData?.photourl} alt="Avatar" />
          </div>
          <h1 className="mx-5 font-bold">
            {targetUser?.userData?.firstName +
              " " +
              targetUser?.userData?.lastName || "Loading..."}
          </h1>
          <div className="justify-end">
            {" "}
            <button
              onClick={handleStartCall}
              className="ml-auto text-blue-600 hover:text-blue-800"
            >
              <Video size={20} />
            </button>
          </div>
        </div>

        <div className="border-t border-base-300 h-96 overflow-y-auto p-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat ${
                msg.firstName === user.firstName ? "chat-end" : "chat-start"
              }`}
            >
              <div className="chat-header">
                {/* {msg.firstName} */}
                <time className="text-xs opacity-50 ml-2">
                  {dayjs(msg.timestamp).format("hh:mm A")}
                </time>
              </div>
              <div className="chat-bubble">
                {msg.text}
                {msg.firstName === user.firstName && (
                  <div className="text-[10px] text-right mt-1 flex justify-end items-center gap-1">
                    {msg.isSeen ? (
                      <CheckCheck size={12} className="text-blue-500" />
                    ) : (
                      <Check size={12} className="text-gray-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        <div className="mt-4 flex">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            type="text"
            placeholder="Type here"
            className="input input-primary flex-grow"
          />
          <button onClick={sendMessage} className="btn btn-primary mx-3">
            Send
          </button>
        </div>
      </div>

      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded shadow-lg w-80">
            <p className="text-center font-semibold text-lg">
              {incomingCall.callerName} is calling you.
            </p>
            <div className="flex justify-center mt-4 gap-3">
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
                className="btn btn-success"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  socketRef.current.emit("respondToCall", {
                    callerId: incomingCall.callerId,
                    response: "declined",
                    roomId: incomingCall.roomId,
                  });
                  setIncomingCall(null);
                }}
                className="btn btn-error"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
