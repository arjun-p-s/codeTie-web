import axios from "axios";
import PropTypes from "prop-types";
import { BASE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { removeFeed } from "../utils/feedSlice";

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
    <div className="flex justify-center  my-10">
      <div className="card bg-base-300 w-96 shadow-xl">
        <figure>
          <img
            className=" w-96 h-56 object-cover object-center "
            src={photourl}
            alt="Photo of User"
          />
        </figure>
        <div className="card-body ">
          <h2 className="card-title">
            {firstName + " " + lastName || "Unknown User"}
          </h2>
          <p>{age + ", " + gender}</p>
          <p>{about}</p>
          <div className="card-actions justify-start my-4">
            <button
              className="btn btn-outline btn-error"
              onClick={() => sendRequest("ignored", user._id)}
            >
              Ignore{" "}
            </button>
            <button
              className="btn btn-outline btn-success "
              onClick={() => sendRequest("interested", user._id)}
            >
              Interested
            </button>
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
