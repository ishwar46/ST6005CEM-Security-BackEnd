// importing Packages
const express = require("express");
const dotenv = require("dotenv");
const connectToDB = require("./database/db");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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
app.use("/api/season", require("./routes/seasonRoutes"));

app.get("/", (req, res) => {
  res.status(200).send("Hello world!");
});

// Defining port
const PORT = process.env.PORT || 5000;
// running the server on port 5000
app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
