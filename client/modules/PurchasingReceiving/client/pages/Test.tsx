const TestPage = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        fontFamily: "system-ui",
      }}
    >
      {" "}
      <div style={{ textAlign: "center", padding: "2rem" }}>
        {" "}
        <h1 style={{ fontSize: "32px", margin: "0 0 1rem 0" }}>
          {" "}
          ✓ App is Working!{" "}
        </h1>{" "}
        <p style={{ fontSize: "18px", color: "#666", margin: "0 0 2rem 0" }}>
          {" "}
          Time: {new Date().toLocaleTimeString()}{" "}
        </p>{" "}
        <div
          style={{
            background: "#f0f0f0",
            padding: "1rem",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#333",
            maxWidth: "400px",
          }}
        >
          {" "}
          <p>
            {" "}
            If you see this message, the React app is successfully
            rendering.{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default TestPage;
