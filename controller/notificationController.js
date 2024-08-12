const crypto = require("crypto-js");
const Notification = require("../models/notifications");

const secretKey = process.env.NOTIFICATION_SECRET_KEY;

// Encrypt the message
function encryptMessage(message) {
  return crypto.AES.encrypt(message, secretKey).toString();
}

// Decrypt the message
function decryptMessage(cipherText) {
  const bytes = crypto.AES.decrypt(cipherText, secretKey);
  return bytes.toString(crypto.enc.Utf8);
}

exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    // Encrypt the message before saving
    const encryptedMessage = encryptMessage(message);

    // Create a new notification object
    const notificationData = { title, message: encryptedMessage };
    if (userId) {
      notificationData.userId = userId;
    }

    const newNotification = new Notification(notificationData);
    await newNotification.save();

    // Emit the encrypted notification to all connected clients
    req.io.emit("receiveNotification", newNotification);

    res.status(200).json(newNotification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.params.userId,
    });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({});
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendGlobalNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    // Encrypt the message before saving
    const encryptedMessage = encryptMessage(message);

    const newNotification = new Notification({
      title,
      message: encryptedMessage,
    });
    await newNotification.save();

    req.io.emit("receiveNotification", newNotification);

    res.status(200).json({
      success: true,
      message: "Notification sent to all users",
      notification: newNotification,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// to decrypt messages
exports.decryptNotification = async (req, res) => {
  try {
    const { id, key } = req.body;

    // Retrieve the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Decrypt only if the key matches
    if (key === secretKey) {
      const decryptedMessage = decryptMessage(notification.message);
      return res
        .status(200)
        .json({ title: notification.title, message: decryptedMessage });
    } else {
      return res.status(403).json({ error: "Invalid decryption key" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
