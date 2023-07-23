const Email = require("../utils/email");
const schedule = require("node-schedule");

function calculateReminderDateTime(slot, daysBefore, hoursBefore) {
  const reminderDate = new Date(slot);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);
  return reminderDate;
}

function formatTimeTo24HourFormat(time) {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function scheduleReminder(user, doctor, slot) {
  const oneDayBefore = calculateReminderDateTime(slot, 1, 0);
  const twoHoursBefore = calculateReminderDateTime(slot, 0, 2);

  const email = new Email(user, doctor, formatTimeTo24HourFormat(slot));

  // Schedule email reminders
  schedule.scheduleJob(oneDayBefore, () => {
    email.send(
      "welcome",
      `Привет ${user.name}! Напоминаем, что вы записаны к ${doctor.name} завтра в ${formatTimeTo24HourFormat(slot)}!`
    );
  });

  schedule.scheduleJob(twoHoursBefore, () => {
    email.send(
      "welcome",
      `Привет ${user.name}! Вам через 2 часа к ${doctor.name} в ${formatTimeTo24HourFormat(slot)}!`
    );
  });
}

module.exports = {
  scheduleReminder,
};
