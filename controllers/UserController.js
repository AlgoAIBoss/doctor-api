const User = require("../models/UserModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./MiddlewareController");

// ###############################
//     User Profile Info
// ###############################
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteMe(User);
exports.updateUser = factory.updateOne(User);

// Get all folders in the user's profile
exports.createAppointment = catchAsync(async (req, res) => {
  const { user_id, doctor_id, slot } = req.body;

  // Check if the user and doctor exist in the database
  const user = await User.findById(user_id);
  const doctor = await Doctor.findById(doctor_id);

  if (!user || !doctor) {
    return res.status(404).json({ message: "User or doctor not found" });
  }

  // Check if the slot is available
  if (!doctor.slots.includes(slot)) {
    return res.status(400).json({ message: "Slot is not available" });
  }

  // Update the doctor's slots and save the appointment
  doctor.slots = doctor.slots.filter((s) => s !== slot);
  await doctor.save();

  // Schedule the reminders
  scheduleReminder(user, doctor, slot);

  // Send a welcome email to the user
  const email = new Email(user);
  await email.sendWelcome();

  return res.status(201).json({ message: "Appointment created successfully" });
});
