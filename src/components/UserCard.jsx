import axios from "axios";
import PropTypes from "prop-types";
import { BASE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { removeFeed } from "../utils/feedSlice";
import { Heart, X, User, Calendar, Info } from "lucide-react";

const UserCard = ({ user }) => {
  const { about, photourl, firstName, lastName, gender, age } = user;
  const dispatch = useDispatch();

  const sendRequest = async (status, userId) => {
    try {
      const res = await axios.post(
        BASE_URL + "request/send/" + status + "/" + userId,
        {},
        { withCredentials: true }
      );
      dispatch(removeFeed(userId));
      console.log(res);
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-300 border border-white/20">
          {/* Profile Image Container */}
          <div className="relative overflow-hidden">
            <img
              className="w-full h-96 object-cover object-center"
              src={photourl}
              alt={`${firstName} ${lastName}`}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            
            {/* Age/Gender Badge */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
              <div className="flex items-center space-x-1 text-sm font-medium text-gray-700">
                <User size={14} />
                <span>{age}, {gender}</span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-4">
            {/* Name */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {firstName} {lastName || "Unknown User"}
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 mx-auto"></div>
            </div>

            {/* About Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <Info size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">
                  {about || "No description available."}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              {/* Ignore Button */}
              <button
                className="flex-1 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-semibold py-4 rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg group"
                onClick={() => sendRequest("ignored", user._id)}
              >
                <div className="flex items-center justify-center space-x-2">
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
                  <span>Pass</span>
                </div>
              </button>

              {/* Interested Button */}
              <button
                className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold py-4 rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-xl group"
                onClick={() => sendRequest("interested", user._id)}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Heart size={20} className="group-hover:scale-110 transition-transform duration-200" />
                  <span>Like</span>
                </div>
              </button>
            </div>

            {/* Swipe Hint */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 font-medium">
                Tap to choose • Swipe for next
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info Cards - Mobile Friendly */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg border border-white/20">
            <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Age</p>
            <p className="text-lg font-bold text-gray-800">{age}</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg border border-white/20">
            <User className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Gender</p>
            <p className="text-lg font-bold text-gray-800 capitalize">{gender}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

UserCard.propTypes = {
  user: PropTypes.object.isRequired,
};

export default UserCard;