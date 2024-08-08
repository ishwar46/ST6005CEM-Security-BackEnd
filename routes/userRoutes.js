// routes/userRoutes.js
const router = require("express").Router();
const userController = require("../controller/userController");
const authMiddleware = require("../middleware/routesAuth");
const userMiddleware = require("../middleware/userMiddleware");
const User = require("../models/user");

// Public routes
router.post("/userregister", userController.userRegister);
router.post("/userlogin", userController.login);
router.get("/gtusers", userController.getUserByInstiuition);
router.post("/changepassword", userController.changePassword);
router.post("/markAttendance", userController.markAttendance);
router.get("/generateQR/:userId", userController.generateQRCode);

// Routes accessible by any authenticated user
router.get("/getUserByid", userMiddleware, userController.getUserById); // Updated route
router.get("/getUserByid/:id", userController.getUsersById); // Updated route

// Routes accessible by admin only
router.get("/getAllUser", authMiddleware, userController.getAllUsers);
router.put("/:userId", authMiddleware, userController.updateUserById);

module.exports = router;
