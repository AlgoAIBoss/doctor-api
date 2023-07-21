const Doctor = require("../models/DoctorModel");
const factory = require("./MiddlewareController");

// ###############################
//     Doctor Profile Info
// ###############################
exports.getDoctor = factory.getOne(Doctor);
exports.deleteDoctor = factory.deleteMe(Doctor);
exports.updateDoctor = factory.updateOne(Doctor);
