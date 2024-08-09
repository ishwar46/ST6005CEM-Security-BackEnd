const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../middleware/sendEmail");
const fs = require("fs");
const handlebars = require("handlebars");
const passwordSchema = require("../helpers/passwordValidation");

function generateRandomPassword(length = 6) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

const adminRegister = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingAdmin = await User.findOne({
      email: email,
      isAdmin: true,
    }).select("-password -__v");

    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin with this email already exists." });
    }

    console.log("Original password:", password);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    const admin = new User({
      email: email,
      password: hashedPassword, // Store the hashed password directly
      isAdmin: true,
    });

    await admin.save();
    res.status(201).json({ message: "Admin registered successfully." });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({ error: error.message });
  }
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login attempt for email:", email);
    const admin = await User.findOne({ email: email, isAdmin: true });

    if (!admin) {
      // console.log("No admin found with this email");
      return res.status(403).json({ error: "Invalid credentials." });
    }

    // console.log("Admin found, checking password...");
    // console.log("Stored hashed password:", admin.password);

    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Password does not match");
      admin.failedAttempts = (admin.failedAttempts || 0) + 1;

      if (admin.failedAttempts >= 5) {
        admin.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
        await admin.save();
        const lockDuration = Math.ceil((admin.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          error: "Account is locked. Please try again later.",
          lockDuration,
        });
      }

      await admin.save();
      return res.status(403).json({
        error: "Invalid credentials.",
        remainingAttempts: 5 - admin.failedAttempts,
      });
    }

    console.log("Password matches, proceeding with login...");

    // Update the lastLogin field
    admin.lastLogin = new Date();
    admin.failedAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        isAdmin: admin.isAdmin,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const adminVerifyUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Assuming admin verification is successful and status is changed to "accepted"
    user.adminVerification.status = "accepted"; // Change the status to "accepted"
    user.isVerifiedByAdmin = true;
    await user.save();

    // Send the password only if the user is verified by admin and status is "accepted"
    // Check if the user is verified by admin and status is "accepted"
    if (
      user.isVerifiedByAdmin &&
      user.adminVerification.status === "accepted"
    ) {
      // Generate a random mixed password
      const randomPassword = generateRandomPassword();

      // Hash the random password using bcrypt
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Update the user's hashed password in the database
      user.personalInformation.userPassword = hashedPassword;
      await user.save();

      // Generate invoice details
      const invoiceNumber = generateInvoiceNumber();
      const invoiceDate = new Date().toISOString().split("T")[0];
      const amountDue = "$300";
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]; //  days from now

      const source = fs.readFileSync("mailtemplate.html", "utf-8").toString();
      const template = handlebars.compile(source);
      const replacements = {
        firstName: user.personalInformation.fullName.firstName,
        middleName: user.personalInformation.fullName.middleName,
        lastName: user.personalInformation.fullName.lastName,
        fullName: `${user.personalInformation.fullName.firstName} ${user.personalInformation.fullName.middleName} ${user.personalInformation.fullName.lastName}`,
        password: randomPassword,
        institution: user.personalInformation.nameOfInstitution,
        officeAddress: user.personalInformation.officeAddress,
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        amountDue: amountDue,
        dueDate: dueDate,
        isChiefDelegateOrSpeaker:
          user.chiefDelegateOrSpeaker.chiefDelegate ||
          user.chiefDelegateOrSpeaker.speaker,
      };

      const htmlToSend = template(replacements);

      // Send email to the user with the random password and invoice details
      await sendEmail({
        subject:
          "Registration Approved - 36th ACSIC Conference Kathmandu, Nepal",
        html: htmlToSend,
        to: user.personalInformation.emailAddress,
      });
    }

    res
      .status(200)
      .json({ success: true, message: "User verified successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// admin edit user
const adminEditUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Find the user by ID and update
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -__v");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "User updated successfully.", user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//delete user

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID and delete
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const generateInvoiceNumber = () => {
  return (
    "ACSICNEP-" +
    Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0")
  );
};

module.exports = {
  adminRegister,
  adminLogin,
  adminVerifyUser,
  deleteUser,
  adminEditUser,
};
