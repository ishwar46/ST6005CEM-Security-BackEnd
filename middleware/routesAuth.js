// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({
      success: false,
      message: "Authorization header missing",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.json({
      success: false,
      message: "Token missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check if the user is an admin
    if (req.user.isAdmin) {
      next();
    } else {
      res.json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = authMiddleware;
