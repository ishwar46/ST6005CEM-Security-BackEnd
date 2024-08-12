// importing Packages
const express = require("express");
const dotenv = require("dotenv");
const connectToDB = require("./database/db");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const socketIo = require("socket.io"); // Import Socket.io

// creating an express app
const app = express();

// configuring dotenv to use the .env file
dotenv.config();
const corsOptions = {
  origin: true,
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// connecting to database
connectToDB();

// accepting json data
app.use(express.json());
// accepting form data
app.use(express.urlencoded({ extended: true }));

const directories = [
  "public/uploads",
  "public/uploads/userimage",
  "public/uploads/accompanyingimages",
  "public/uploads/bannerimages",
];

directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create an HTTP server
const server = http.createServer(app);

// Set up Socket.IO with the HTTP server
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware to attach `io` to `req`
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// Middleware to log the route and method
app.use((req, res, next) => {
  console.log(`Route: ${req.originalUrl}, Method: ${req.method}`);
  next();
});

// Defining routes
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  "/public/uploads",
  express.static(path.join(__dirname, "public/uploads"))
);
app.use(
  "/public/uploads/userimage",
  express.static(path.join(__dirname, "public/uploads/userimage"))
);
app.use(
  "/public/uploads/accompanyingimages",
  express.static(path.join(__dirname, "public/uploads/accompanyingimages"))
);
app.use(
  "/public/uploads/bannerimages",
  express.static(path.join(__dirname, "public/uploads/bannerimages"))
);

app.use("/api/gallery", require("./routes/galleryRoutes"));
app.use("/api/speaker", require("./routes/speakerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/season", require("./routes/sessionRoute"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.get("/", (req, res) => {
  res.status(200).send("Hello world!");
});

// Defining port
const PORT = process.env.PORT || 5000;

// running the server on port 5000
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
