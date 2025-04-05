import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addConnectionRequest,
  removeConnectionRequest,
} from "../utils/connectionRequestSlice";

const ConnectionRequest = () => {
  const connectionRequests = useSelector((store) => store.requests) ?? [];
  const dispatch = useDispatch();
  const fetchConnections = async () => {
    try {
      const res = await axios.get(BASE_URL + "user/request/received", {
        withCredentials: true,
      });
      dispatch(addConnectionRequest(res?.data?.connectionRequest));
    } catch (error) {
      console.error(error.message);
    }
  };
  const removeConnections = async (status, _id) => {
    try {
      const res = await axios.post(
        BASE_URL + "request/review/" + status + "/" + _id,
        {},
        { withCredentials: true }
      );
      dispatch(removeConnectionRequest(_id));
      console.log(res);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  if (connectionRequests.length === 0)
    return (
      <h1 className="text-center my-10 font-bold text-2xl">
        No Connection Request Recieved
      </h1>
    );
  return (
    <div className="flex justify-center">
      <div className=" lg:flex    lg:justify-center flex-col">
        <h1 className="text-center my-10 font-bold text-2xl">
          Request Received
        </h1>
        {connectionRequests.map((connectionRequest) => {
          const { _id, fromUserId } = connectionRequest;
          const { firstName, lastName, photourl, about, age, gender } =
            fromUserId ?? {};
          console.log(photourl);

          return (
            <div
              key={_id}
              className="card card-side bg-base-300 shadow-xl w-fit my-5"
            >
              <figure>
                <img
                  className=" w-60 h-56 object-cover object-top "
                  src={photourl}
                  alt="User Photo"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{firstName + " " + lastName}</h2>
                <p className="font-normal text-base text-start ">
                  {age + ", " + gender}
                </p>
                <p className="font-normal text-base text-start">{about}</p>
                <div className="card-actions justify-end">
                  <button
                    className="btn btn-outline btn-success"
                    onClick={() =>
                      removeConnections("accepted", connectionRequest._id)
                    }
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-outline btn-error"
                    onClick={() =>
                      removeConnections("rejected", connectionRequest._id)
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectionRequest;
