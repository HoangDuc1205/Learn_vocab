const express = require("express");
const router = express.Router();
const vocabularyController = require("../controllers/vocabularyController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, vocabularyController.getUserProgress);
router.post("/sync", authMiddleware, vocabularyController.syncUserProgress);

module.exports = router;
