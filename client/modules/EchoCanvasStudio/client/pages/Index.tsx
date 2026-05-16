import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/editor");
  }, [navigate]);
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a1a33",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {" "}
      <div style={{ textAlign: "center" }}>
        {" "}
        <h1
          style={{ color: "#00f0ff", fontSize: "36px", marginBottom: "16px" }}
        >
          {" "}
          EchoCanva Ai{" "}
        </h1>{" "}
        <p style={{ color: "#666", fontSize: "14px" }}>
          {" "}
          Redirecting to editor...{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
