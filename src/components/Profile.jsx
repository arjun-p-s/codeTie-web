import { useSelector } from "react-redux";
import ProfileEdit from "./ProfileEdit";

function Profile() {
  const user = useSelector((store) => store.user);
  return (
    user && (
      <div>
        <ProfileEdit user={user} />
      </div>
    )
  );
}

export default Profile;
