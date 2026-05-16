import React from "react";
import { useParams, Navigate } from "react-router-dom";
import GuestJoinComponent from "@/modules/VideoConference/GuestJoinPage";

const GuestJoinPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();

  if (!linkId) {
    return <Navigate to="/" replace />;
  }

  return <GuestJoinComponent linkId={linkId} />;
};

export default GuestJoinPage;
