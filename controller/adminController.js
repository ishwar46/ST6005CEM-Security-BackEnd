const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../middleware/sendEmail");
const fs = require("fs");
const handlebars = require("handlebars");
const passwordSchema = require("../helpers/passwordValidation");
const LoginActivity = require("../models/loginaActivity");

function generateRandomPassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}|;:',.<>?/";
  const allChars = uppercase + lowercase + digits + symbols;

  let password = "";

  // Ensure the password meets the criteria
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));

  // Generate the remaining characters randomly
  for (let i = 4; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the characters in the password to avoid any predictable patterns
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  // Validate against the schema
  while (!passwordSchema.validate(password)) {
    password = generateRandomPassword(); // Regenerate if it doesn't meet the schema
  }

  return password;
}

const adminRegister = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate the password against the schema
    const passwordValidationErrors = passwordSchema.validate(password, {
      list: true,
    });

    if (passwordValidationErrors.length > 0) {
      return res.status(400).json({
        error: "Password does not meet the requirements.",
        details: passwordValidationErrors,
      });
    }

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
    const admin = await User.findOne({ email: email, isAdmin: true });

    if (!admin) {
      await LoginActivity.create({
        email,
        role: "admin",
        success: false,
        message: "Invalid credentials.",
        endpoint: req.originalUrl,
        requestDetails: JSON.stringify(req.body),
      });
      return res.status(403).json({ error: "Invalid credentials." });
    }

    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const lockDuration = Math.ceil((admin.lockUntil - Date.now()) / 1000);
      await LoginActivity.create({
        email,
        role: "admin",
        success: false,
        message: `Account is locked. Please try again later. Lock duration: ${lockDuration} seconds`,
        endpoint: req.originalUrl,
        requestDetails: JSON.stringify(req.body),
      });
      return res.status(403).json({
        error: "Account is locked. Please try again later.",
        lockDuration,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      admin.failedAttempts = (admin.failedAttempts || 0) + 1;

      if (admin.failedAttempts >= 5) {
        admin.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
        await admin.save();
        const lockDuration = Math.ceil((admin.lockUntil - Date.now()) / 1000);
        await LoginActivity.create({
          email,
          role: "admin",
          success: false,
          message: "Account is locked due to too many failed attempts.",
          endpoint: req.originalUrl,
          requestDetails: JSON.stringify(req.body),
        });
        return res.status(403).json({
          error: "Account is locked. Please try again later.",
          lockDuration,
        });
      }

      await admin.save();
      await LoginActivity.create({
        email,
        role: "admin",
        success: false,
        message: "Invalid credentials.",
        remainingAttempts: 5 - admin.failedAttempts,
        endpoint: req.originalUrl,
        requestDetails: JSON.stringify(req.body),
      });
      return res.status(403).json({
        error: "Invalid credentials.",
        remainingAttempts: 5 - admin.failedAttempts,
      });
    }

    admin.failedAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await LoginActivity.create({
      email,
      role: "admin",
      success: true,
      message: "Admin login successful.",
      method: req.method, // Log the HTTP method
      endpoint: req.originalUrl, // Log the endpoint route
      requestDetails: JSON.stringify(req.body),
      lastLogin: admin.lastLogin, // Log the last login time
    });

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

//Login Activites

const getLoginActivities = async (req, res) => {
  try {
    const activities = await LoginActivity.find().sort({ timestamp: -1 });
    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error("Error fetching login activities:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//Delete Login Activities

const deleteLoginActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await LoginActivity.findByIdAndDelete(id);

    if (!activity) {
      return res.status(404).json({ error: "Login activity not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Login activity deleted successfully." });
  } catch (error) {
    console.error("Error deleting login activity:", error);
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
        subject: "Registration Approved - ASIAN Conference",
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

function generateInvoiceNumber() {
  // Generate a unique invoice number, e.g., using the current timestamp and a random number
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `INV-${timestamp}-${randomNum}`;
}

module.exports = {
  adminRegister,
  adminLogin,
  adminVerifyUser,
  deleteUser,
  adminEditUser,
  getLoginActivities,
  deleteLoginActivity,
};
