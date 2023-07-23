const User = require("../models/UserModel");
const Doctor = require("../models/DoctorModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./MiddlewareController");
const Email = require("../utils/email");
const { scheduleReminder } = require("./remController");


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

  // Convert the slot to the ISO 8601 format
  const isoSlot = new Date(slot).toISOString();

  // Check if the user's slot exists in the doctor's slots
  const isSlotAvailable = doctor.slots.some((doctorSlot) => {
    // Convert the doctorSlot to ISO string format
    const doctorSlotISOString = new Date(doctorSlot).toISOString();
    return doctorSlotISOString === isoSlot;
  });

  if (!isSlotAvailable) {
    return res.status(400).json({ message: "Slot is not available" });
  }

  // Update the doctor's slots and save the appointment
  doctor.slots = doctor.slots.filter((doctorSlot) => {
    // Convert the doctorSlot to ISO string format
    const doctorSlotISOString = new Date(doctorSlot).toISOString();
    return doctorSlotISOString !== isoSlot;
  });

  await doctor.save();

  // Schedule the reminders using node-schedule
  scheduleReminder(user, doctor, isoSlot);

  return res.status(201).json({ message: "Appointment created successfully" });
});