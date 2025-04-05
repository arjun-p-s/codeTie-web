import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addConnections } from "../utils/connectionSlice";
import { Link } from "react-router";

const Connections = () => {
  const connections = useSelector((store) => store.connections || []);
  console.log(connections);

  const dispatch = useDispatch();
  const fetchConnections = async () => {
    try {
      const res = await axios.get(BASE_URL + "user/connections", {
        withCredentials: true,
      });
      dispatch(addConnections(res?.data?.data));
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  if (!connections) return;

  if (connections.length === 0) return <h1>No connections found</h1>;
  return (
    <div className="text-center justify-center m-10 text-2xl font-bold">
      <div>connections</div>

      {connections.map((connection) => {
        const { _id, firstName, lastName, photourl, about, age, gender } =
          connection;
        return (
          <div key={_id} className=" lg:flex  lg:m-10  lg:justify-center ">
            <div className="card card-side bg-base-300 shadow- w-fit">
              <figure>
                <img
                  className=" w-60 h-56 object-cover object-top "
                  src={photourl}
                  alt="Movie"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title ">{firstName + " " + lastName}</h2>

                <p className="font-normal text-base text-start ">
                  {age + ", " + gender}
                </p>
                <p className="font-normal text-base text-start">{about}</p>
                <div className="card-actions justify-end">
                  <Link to={"/chat/" + _id}>
                    <button className="btn btn-outline btn-primary">
                      Message
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Connections;
