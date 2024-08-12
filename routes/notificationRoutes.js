const express = require("express");
const router = express.Router();
const notificationController = require("../controller/notificationController");

router.post("/send", notificationController.sendNotification);
router.post("/sendGlobal", notificationController.sendGlobalNotification);

router.get("/all", notificationController.getAllNotifications);
router.post("/decrypt", notificationController.decryptNotification);

router.get("/:userId", notificationController.getNotifications);
module.exports = router;
