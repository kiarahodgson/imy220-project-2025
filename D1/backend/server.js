const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

//  Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  // check to mimic validation on server
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password are required." });
  }
  return res.json({
    ok: true,
    user: { id: "u1", name: "Demo User", email },
    token: "dummy-token",
  });
});

app.post("/api/auth/signup", (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ ok: false, message: "Name, email and password are required." });
  }
  return res.json({
    ok: true,
    user: { id: "u2", name, email },
    token: "dummy-token",
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, status: "healthy" }));

//  Serve React app 
const clientPath = path.join(__dirname, "public");
app.use(express.static(clientPath));

// Fallback to React for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
