const fs = require("fs");
const Email = require("../utils/Email");

function logReminder(message) {
  const logMessage = `${new Date().toISOString()} | ${message}`;
  fs.appendFile("reminders.log", logMessage + "\n", (err) => {
    if (err) {
      console.error("Error logging reminder:", err);
    }
  });
}

function scheduleReminder(user, doctor, slot) {
  const oneDayBefore = new Date(slot);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);

  const twoHoursBefore = new Date(slot);
  twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

  const email = new Email(user);

  // Schedule email reminders
  scheduleEmailReminder(
    email,
    "oneDayBeforeReminder",
    "Привет {{name}}! Напоминаем что вы записаны к {{doctor}} завтра в {{time}}!",
    {
      name: user.name,
      doctor: doctor.spec,
      time: oneDayBefore.toLocaleTimeString(),
    }
  );

  scheduleEmailReminder(
    email,
    "twoHoursBeforeReminder",
    "Привет {{name}}! Вам через 2 часа к {{doctor}} в {{time}}!",
    {
      name: user.name,
      doctor: doctor.spec,
      time: twoHoursBefore.toLocaleTimeString(),
    }
  );
}

function scheduleEmailReminder(email, jobName, subject, data) {
  // Define job for the email reminder
  agenda.define(jobName, (job) => {
    email.send(data.template, subject);
    job.done();
  });

  // Schedule the job
  agenda.schedule(oneDayBefore, jobName);
}

module.exports = {
  scheduleReminder,
};
