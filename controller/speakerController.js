const Speaker = require("../models/speaker");
const upload = require("../middleware/uploads");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const createSpeaker = async (req, res) => {
  try {
    console.log(req.body, req.file);
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          message: "Error uploading image.",
          error: err.message,
        });
      }

      const { fullName, institution, designation, email, biography } = req.body;
      if (!fullName || !institution || !designation || !biography) {
        return res.status(400).send({
          success: false,
          message: "All fields are required.",
        });
      }

      // Check if the email already exists
      const existingSpeaker = await Speaker.findOne({ email });
      if (existingSpeaker) {
        // Delete the uploaded image if the email already exists
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).send({
          success: false,
          message: "A speaker with this email already exists. Image not saved.",
        });
      }

      // Hash the static password
      const hashedPassword = await bcrypt.hash(process.env.STATIC_PASSWORD, 10);

      const newSpeaker = new Speaker({
        fullName,
        institution,
        designation,
        email,
        password: hashedPassword,
        image: req.file ? req.file.path : null,
        biography,
        isSpeaker: true,
      });
      await newSpeaker.save();

      return res.status(200).send({
        success: true,
        message: "Speaker registered successfully",
        speaker: newSpeaker,
      });
    });
  } catch (error) {
    console.error("Error creating speaker:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const loginSpeaker = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Email and password are required.",
      });
    }

    const speaker = await Speaker.findOne({ email });
    if (!speaker) {
      return res.status(400).send({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, speaker.password);
    if (!isMatch) {
      return res.status(400).send({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { id: speaker._id, isSpeaker: true },
      process.env.JWT_SECRET,
      {
        expiresIn: "7 days",
      }
    ); // Replace "your_jwt_secret" with your actual secret

    res.status(200).send({
      success: true,
      message: "Login successful",
      token,
      speaker,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const getSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;
    const speaker = await Speaker.findById(id);
    if (!speaker) {
      return res
        .status(404)
        .send({ success: false, message: "Speaker not found." });
    }
    res.status(200).send({ success: true, speaker });
  } catch (error) {
    console.error("Error fetching speaker by ID:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const getAllSpeakers = async (req, res) => {
  try {
    const speakers = await Speaker.find();
    res.status(200).send({ success: true, speakers });
  } catch (error) {
    console.error("Error fetching all speakers:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const deleteSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSpeaker = await Speaker.findByIdAndDelete(id);
    if (!deletedSpeaker) {
      return res
        .status(404)
        .send({ success: false, message: "Speaker not found." });
    }

    // Remove image file from upload folder if it exists
    if (deletedSpeaker.image) {
      fs.unlinkSync(deletedSpeaker.image);
    }

    res.status(200).send({
      success: true,
      message: "Speaker deleted successfully",
      speaker: deletedSpeaker,
    });
  } catch (error) {
    console.error("Error deleting speaker by ID:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const updateSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;
    const speaker = await Speaker.findById(id);
    if (!speaker) {
      return res
        .status(404)
        .send({ success: false, message: "Speaker not found." });
    }

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          message: "Error uploading image.",
          error: err.message,
        });
      }

      const { name, companyName, designation, topic, biography, agendas } =
        req.body;
      if (!name || !companyName || !designation || !topic || !biography) {
        return res.status(400).send({
          success: false,
          message: "All fields are required.",
        });
      }

      // Parse agendas
      let parsedAgendas;
      try {
        parsedAgendas = JSON.parse(agendas);
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: "Invalid format for agendas. Must be a JSON array.",
        });
      }

      // Save the old image path before updating
      const oldImagePath = speaker.image;

      speaker.name = name;
      speaker.companyName = companyName;
      speaker.designation = designation;
      speaker.topic = topic;
      speaker.biography = biography;
      speaker.agendas = parsedAgendas;
      speaker.image = req.file ? req.file.path : speaker.image;

      await speaker.save();

      // Remove the old image if a new image is uploaded and the old image path exists
      if (req.file && oldImagePath) {
        fs.unlinkSync(oldImagePath);
      }

      res.status(200).send({
        success: true,
        message: "Speaker updated successfully",
        speaker,
      });
    });
  } catch (error) {
    console.error("Error updating speaker by ID:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

module.exports = {
  createSpeaker,
  getSpeakerById,
  getAllSpeakers,
  deleteSpeakerById,
  updateSpeakerById,
  loginSpeaker,
};
