const router = require("express").Router();
const {
  adminRegister,
  adminLogin,
  adminVerifyUser,
  deleteUser,
  adminEditUser,
  getLoginActivities,
  deleteLoginActivity,
} = require("../controller/adminController");
const authAdmin = require("../middleware/adminAuth");

router.post("/register", authAdmin, adminRegister);
router.post("/login", adminLogin);
router.put("/verify/:userId", adminVerifyUser);
router.delete("/delete/:userId", authAdmin, deleteUser);
router.put("/edit/:userId", authAdmin, adminEditUser);
router.get("/login-activities", authAdmin, getLoginActivities);
router.delete("/login-activities/:id", authAdmin, deleteLoginActivity);
module.exports = router;
