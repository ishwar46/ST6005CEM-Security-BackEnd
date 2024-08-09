const User = require("../models/user");
const bcrypt = require("bcrypt");
const upload = require("../middleware/multipledocs");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");

const userRegister = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          message: "Error uploading image.",
          error: err.message,
        });
      }

      // Check if req.files is defined and contains the uploaded files
      if (!req.files || !req.files.userimage) {
        return res.status(400).send({
          success: false,
          message: "No profile picture uploaded or file path missing.",
        });
      }

      // Access the paths of the uploaded files
      const userimage = req.files.userimage
        ? req.files.userimage[0].path
        : null;
      const accompanyingimages = req.files.accompanyingimages
        ? req.files.accompanyingimages[0].path
        : null;
      const paymentReceipt =
        req.files.paymentReceipt && req.files.paymentReceipt[0]
          ? req.files.paymentReceipt[0].path
          : null;
      const {
        title,
        firstName,
        middleName,
        lastName,
        nationality,
        nameOfInstitution,
        jobPosition,
        officeAddress,
        emailAddress,
        phoneNumber,
        mobileNumber,
        checkInDate,
        checkOutDate,
        vegetarian,
        halal,
        nonveg,
        other,
        simType,
        takeSim,
        chiefDelegate,
        participant,
        biography,
        hasAccompanyingPerson,
        accompanyingTitle,
        accompanyingFirstName,
        accompanyingMiddleName,
        accompanyingLastName,
        relationship,
        accompanyingVegetarian,
        accompanyingNonVegetarian,
        accompanyingHalal,
        accompanyingOther,
        termsandcond,
        biographyguidelinesread,
        privacypolicyready,
        pictureuploadread,
        pictureuploadreadAccompany,
        otherInstitution,
      } = req.body;
      const defaultPassword = process.env.DEFAULT_PASSWORD;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Check if the email already exists in the database
      const existingUser = await User.findOne({
        "personalInformation.emailAddress": emailAddress,
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "Email address already exists." });
      }

      //Determine the instituion
      const institutionName =
        nameOfInstitution === "other" ? otherInstitution : nameOfInstitution;

      // Create a new user instance with the uploaded file paths
      const newUser = new User({
        personalInformation: {
          title,
          fullName: {
            firstName,
            middleName,
            lastName,
          },
          nationality,
          nameOfInstitution: institutionName,
          jobPosition,
          officeAddress,
          emailAddress,
          phoneNumber,
          mobileNumber,
          uploadPaymentReceipt: paymentReceipt, // Add payment receipt path here
          userPassword: hashedPassword,
        },
        accommodation: {
          checkInDate,
          checkOutDate,
        },
        dietaryRequirements: {
          vegetarian,
          halal,
          nonveg,
          other,
        },
        mobileSimCardRequirements: {
          simType,
          takeSim,
        },
        profilePicture: {
          fileName: userimage,
        },
        chiefDelegateOrSpeaker: {
          chiefDelegate,
          participant,
        },
        biography,
        termsandcond,
        biographyguidelinesread,
        privacypolicyready,
        pictureuploadread,
      });

      // Add accompanying person information if hasAccompanyingPerson is true
      if (hasAccompanyingPerson) {
        newUser.accompanyingPerson = {
          hasAccompanyingPerson,
          accompanyingPersonInformation: {
            title: accompanyingTitle,
            fullName: {
              firstName: accompanyingFirstName,
              middleName: accompanyingMiddleName,
              lastName: accompanyingLastName,
            },
            relationship,
            dietaryRequirements: {
              vegetarian: accompanyingVegetarian,
              halal: accompanyingHalal,
              nonveg: accompanyingNonVegetarian,
              other: accompanyingOther,
            },
            pictureUrl: accompanyingimages,
          },
          pictureuploadreadAccompany: pictureuploadreadAccompany,
        };
      }

      // Save the new user to the database
      await newUser.save();

      res.status(200).json({
        success: true,
        message: "User registered successfully.",
        user: newUser,
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const login = async (req, res) => {
  const { firstName, password } = req.body;

  try {
    if (!firstName || !password) {
      return res.status(400).json({
        error: "Both first name and password are required.",
      });
    }

    const users = await User.find({
      "personalInformation.fullName.firstName": firstName,
    });

    if (users.length === 0) {
      return res.status(401).json({
        error: "Invalid credentials.",
      });
    }

    let user = null;

    // Loop through users to find the one with the matching password
    for (let i = 0; i < users.length; i++) {
      const isPasswordMatch = await bcrypt.compare(
        password,
        users[i].personalInformation.userPassword
      );

      if (isPasswordMatch) {
        user = users[i];
        break;
      }
    }

    if (!user) {
      // If no password matched, increment failedAttempts for all users with the same first name
      for (let i = 0; i < users.length; i++) {
        users[i].failedAttempts = (users[i].failedAttempts || 0) + 1;

        if (users[i].failedAttempts >= 5) {
          users[i].lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
          await users[i].save();
          return res.status(403).json({
            error: "Account is locked. Please try again later.",
            lockDuration: 1800, // 30 minutes
          });
        }

        await users[i].save();
      }

      const remainingAttempts = 5 - users[0].failedAttempts;
      return res.status(403).json({
        error: "Invalid credentials.",
        remainingAttempts,
      });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockDuration = Math.ceil((user.lockUntil - Date.now()) / 1000);
      return res.status(403).json({
        error: "Account is locked. Please try again later.",
        lockDuration,
      });
    }

    // If the password is correct, reset failed attempts and lockUntil
    user.failedAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "6h",
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        personalInformation: user.personalInformation,
        lastLogin: user.lastLogin,
        dietaryRequirements: user.dietaryRequirements,
        accompanyingPerson: user.accompanyingPerson,
        profilePicture: user.profilePicture,
        adminVerification: user.adminVerification,
        isVerifiedByAdmin: user.isVerifiedByAdmin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }); // Exclude users where isAdmin is true

    // Identify duplicates
    const nameCounts = {};
    users.forEach((user) => {
      const fullName = `${user.personalInformation.fullName.firstName} ${
        user.personalInformation.fullName.middleName || ""
      } ${user.personalInformation.fullName.lastName}`;
      if (nameCounts[fullName]) {
        nameCounts[fullName].count++;
        nameCounts[fullName].users.push(user._id);
      } else {
        nameCounts[fullName] = { count: 1, users: [user._id] };
      }
    });

    const duplicateUserIds = Object.values(nameCounts)
      .filter((name) => name.count > 1)
      .flatMap((name) => name.users);

    res.status(200).json({ success: true, users, duplicateUserIds });
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users.",
    });
  }
};

// Controller to get a user by ID
const getUsersById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password -__v");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};
const getUserById = async (req, res) => {
  try {
    const id = req.user.userId;

    const user = await User.findById(id).select("-password -__v");
    if (!user) {
      console.log("User not found for ID:", id);
      return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Controller to update a user by ID
const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -__v");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//Change Password
const changePassword = async (req, res) => {
  const { firstName, email, password, newPassword, confirmPassword } = req.body;

  if (!firstName || !email || !password || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Please enter all fields",
    });
  }

  try {
    // Fetch all users with the provided email
    const users = await User.find({
      "personalInformation.emailAddress": email,
    });
    if (!users || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email",
      });
    }
    //change password

    // Iterate through each user and check passwords
    let passwordChanged = false;
    for (let user of users) {
      // Check if the first name matches (assuming case insensitive)
      if (
        user.personalInformation.fullName.firstName.toLowerCase() ===
        firstName.toLowerCase()
      ) {
        // Compare passwords
        const isMatched = await bcrypt.compare(
          password,
          user.personalInformation.userPassword
        );

        if (isMatched) {
          // Validate new password length
          if (newPassword.length < 6 || confirmPassword.length < 6) {
            return res.status(400).json({
              success: false,
              message: "Password must have at least 6 characters",
            });
          }

          // Compare new and confirm passwords
          if (newPassword !== confirmPassword) {
            return res.status(400).json({
              success: false,
              message: "New and Confirm Password did not match",
            });
          }

          // Hash the new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);

          // Update user's password
          user.personalInformation.userPassword = hashedPassword;
          await user.save();

          passwordChanged = true;
          break;
        }
      }
    }

    if (!passwordChanged) {
      return res.status(400).json({
        success: false,
        message: "Invalid Username or Incorrect old Password",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.log(`Error in change password: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUserByInstiuition = async (req, res) => {
  try {
    const { institution } = req.query;
    const users = await User.find({
      "personalInformation.nameOfInstitution": institution,
    }).select("-password"); // Exclude password field
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Log the current date being compared
    console.log("Current date:", today);

    const alreadyMarked = user.attendance.some((attendance) => {
      const attendanceDate = new Date(attendance.date.$date || attendance.date);
      attendanceDate.setHours(0, 0, 0, 0);
      console.log(
        "Comparing attendance date:",
        attendanceDate,
        "with today:",
        today
      );
      return attendanceDate.getTime() === today.getTime();
    });

    if (alreadyMarked) {
      console.log("Attendance already marked for today.");
      return res
        .status(400)
        .json({ error: "Attendance already marked for today." });
    }

    user.attendance.push({ date: new Date(), status: true });
    await user.save();

    console.log("Attendance marked successfully.");

    res.status(200).json({
      success: true,
      user,
      message: "Attendance marked successfully.",
    });
  } catch (error) {
    console.error("Error in marking attendance:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const generateQRCode = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const qrCodeText = `UserId: ${userId}`;
    const qrCodeOptions = {
      type: "png", // can also be svg, jpeg, etc.
      errorCorrectionLevel: "H", // higher error correction level
      quality: 0.92, // image quality factor
      margin: 1, // white space around QR codej
    };

    const qrCode = await QRCode.toDataURL(qrCodeText, qrCodeOptions);

    // Save the QR code data to user model
    user.qrCode = qrCode;
    await user.save();

    res.status(200).json({ success: true, qrCode });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
module.exports = {
  userRegister,
  getAllUsers,
  getUserById,
  login,
  updateUserById,
  getUserByInstiuition,
  changePassword,
  markAttendance,
  generateQRCode,
  getUsersById,
};
