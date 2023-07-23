const express = require("express");
const doctorController = require("../controllers/DoctorController");
const authController = require("../controllers/AuthDoctorController");

const router = express.Router();

// Authentication Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/google-login", authController.googleLogin);


router.use(authController.protect); // Protect all routes after this middleware
// User Account Info Routes
router
  .route("/profile/:id")
  .get(doctorController.getDoctor)
  .patch(doctorController.updateDoctor);
router.delete("/delete-me/:id", doctorController.deleteDoctor);

module.exports = router;
