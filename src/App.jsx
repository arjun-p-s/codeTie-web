import Body from "./components/Body";
import { BrowserRouter, Route, Routes } from "react-router";
import Login from "./components/Login";
import appStore from "./utils/appStore";
import { Provider } from "react-redux";
import Feed from "./components/Feed";
import Profile from "./components/Profile";
import UserCard from "./components/UserCard";
import Connections from "./components/Connections";
import ConnectionRequest from "./components/ConnectionRequest";

function App() {
  return (
    <div>
      <Provider store={appStore}>
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/" element={<Body />}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/usercard" element={<UserCard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/login" element={<Login />} />
              <Route path="/requests" element={<ConnectionRequest />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Provider>
    </div>
  );
}

export default App;
