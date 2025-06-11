import { useParams } from "react-router-dom";
import VideoCall from "../components/VideoCall";

const VideoCallWrapper = () => {
  const { roomId } = useParams();
  return <VideoCall roomId={roomId} />;
};

export default VideoCallWrapper;
