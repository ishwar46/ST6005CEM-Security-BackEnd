const router = require("express").Router();
const speakerController = require("../controller/speakerController");
const authMiddleware = require("../middleware/routesAuth");

router.post("/addSpeaker", authMiddleware, speakerController.createSpeaker);
router.post("/login", speakerController.loginSpeaker);
router.get("/getSpeakerById/:id", speakerController.getSpeakerById);
router.get("/getAllSpeakers", speakerController.getAllSpeakers);
router.delete(
    "/deleteSpeaker/:id",
    authMiddleware,
    speakerController.deleteSpeakerById
);
router.put(
    "/updateSpeaker/:id",
    authMiddleware,
    speakerController.updateSpeakerById
);

module.exports = router;