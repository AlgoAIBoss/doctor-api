const express = require("express");
const doctorController = require("../controllers/DoctorController");
const authController = require("../controllers/AuthController");

const router = express.Router();

// Authentication Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/google-login", authController.googleLogin);
router.post("/twitter-login", authController.facebookLogin);

// User Account Info Routes
router
  .route("/profile/:id")
  .get(doctorController.getDoctor)
  .patch(doctorController.deleteDoctor);
router.delete("/delete-me/:id", doctorController.updateDoctor);

module.exports = router;
