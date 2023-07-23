const express = require("express");
const userController = require("../controllers/UserController");
const authController = require("../controllers/AuthController");

const router = express.Router();

// Authentication Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/google-login", authController.googleLogin);

router.use(authController.protect); // Protect all routes after this middleware
router.patch("/update-my-password", authController.updatePassword);

// User Account Info Routes
router
  .route("/profile/:id")
  .get(userController.getUser)
  .patch(userController.updateUser);
router.delete("/delete-me/:id", userController.deleteUser);
router.post("/appointment", userController.createAppointment);

module.exports = router;
