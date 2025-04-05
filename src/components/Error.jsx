import { useNavigate } from "react-router";

function Error() {
  const navigate = useNavigate();
  const userNavigate = () => {
    navigate("/login");
  };
  return (
    <div className="flex justify-center my-10">
      <div className="card bg-primary text-primary-content w-96">
        <div className="card-body">
          <h2 className="card-title">Hello There!</h2>
          <p>Something Went Wrong</p>
          <div className="card-actions justify-end">
            <button className="btn" onClick={userNavigate}>
              Login Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Error;
