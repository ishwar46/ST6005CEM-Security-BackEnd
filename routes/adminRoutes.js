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

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.put("/verify/:userId", adminVerifyUser);
router.delete("/delete/:userId", deleteUser);
router.put("/edit/:userId", adminEditUser);
router.get("/login-activities", getLoginActivities);
router.delete("/login-activities/:id", deleteLoginActivity);

module.exports = router;
