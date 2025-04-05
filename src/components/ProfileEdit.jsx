import { useState } from "react";
import PropTypes from "prop-types";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";

const ProfileEdit = ({ user }) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [gender, setGender] = useState(user.gender);
  const [age, setAge] = useState(user.age);
  const [about, setAbout] = useState(user.about);
  const [photourl, setPhotoUrl] = useState(user.photourl);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const dispatch = useDispatch();

  const saveProfile = async () => {
    setError("");
    try {
      console.log(BASE_URL + "profile/edit");
      const res = await axios.patch(
        BASE_URL + "profile/edit",
        { firstName, lastName, gender, age, about, photourl },
        { withCredentials: true }
      );

      dispatch(addUser(res?.data?.data));
      setShowToast(true);
      setInterval(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.ERROR);
    }
  };

  return (
    <>
      <div className="lg:flex justify-center  ">
        <div className="flex justify-center my-10 mx-10 ">
          <div className="card bg-base-300 w-96 shadow-xl mb-10">
            <div className="card-body">
              <h2 className="card-title justify-center">Update Profile</h2>

              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">First Name :</span>
                </div>
                <input
                  type="text"
                  value={firstName}
                  className="input input-bordered  w-full max-w-xs"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Last Name :</span>
                </div>
                <input
                  type="text"
                  value={lastName}
                  className="input input-bordered  w-full max-w-xs"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Age :</span>
                </div>
                <input
                  type="text"
                  value={age}
                  className="input input-bordered  w-full max-w-xs"
                  onChange={(e) => setAge(e.target.value)}
                />
              </label>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Gender :</span>
                </div>
                <input
                  type="text"
                  value={gender}
                  className="input input-bordered  w-full max-w-xs"
                  onChange={(e) => setGender(e.target.value)}
                />
              </label>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Photo Url :</span>
                </div>
                <textarea
                  className="textarea textarea-bordered"
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  value={photourl}
                ></textarea>
              </label>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">About :</span>
                </div>
                <textarea
                  className="textarea textarea-bordered"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                ></textarea>
              </label>
              <p className="text-red-500">{error}</p>

              <div className="card-actions justify-center my-4">
                <button className="btn btn-primary" onClick={saveProfile}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="md:mb-0">
          <UserCard
            user={{ firstName, lastName, age, gender, about, photourl }}

          />
        </div>
      </div>
      {showToast && (
        <div className="toast toast-top toast-center">
          <div className="alert alert-success">
            <span>Message sent successfully.</span>
          </div>
        </div>
      )}
    </>
  );
};

ProfileEdit.propTypes = {
  user: PropTypes.object.isRequired,
};

export default ProfileEdit;
