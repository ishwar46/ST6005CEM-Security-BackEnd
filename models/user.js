const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    personalInformation: {
        title: { type: String },
        fullName: {
            firstName: { type: String },
            middleName: { type: String },
            lastName: { type: String },
        },
        nationality: { type: String },
        nameOfInstitution: { type: String },
        jobPosition: { type: String },
        officeAddress: { type: String },
        emailAddress: { type: String },
        phoneNumber: { type: String },
        mobileNumber: { type: String },
        userPassword: { type: String },
        uploadPaymentReceipt: { type: String },
    },
    accommodation: {
        checkInDate: { type: Date },
        checkOutDate: { type: Date },
    },
    dietaryRequirements: {
        vegetarian: { type: Boolean, default: false },
        halal: { type: Boolean, default: false },
        nonveg: { type: Boolean, default: false },
        other: { type: String },
    },
    mobileSimCardRequirements: {
        takeSim: { type: Boolean, default: false },
        simType: { type: String },
    },
    profilePicture: {
        uploadDate: { type: Date, default: Date.now },
        fileName: { type: String },
    },
    chiefDelegateOrSpeaker: {
        chiefDelegate: { type: Boolean, default: false },
        participant: { type: Boolean, default: false },
    },
    biography: { type: String },
    accompanyingPerson: {
        hasAccompanyingPerson: { type: Boolean, default: false },
        accompanyingPersonInformation: {
            title: { type: String },
            fullName: {
                firstName: { type: String },
                middleName: { type: String },
                lastName: { type: String },
            },
            relationship: { type: String },
            dietaryRequirements: {
                vegetarian: { type: Boolean, default: false },
                halal: { type: Boolean, default: false },
                nonveg: { type: Boolean, default: false },
                other: { type: String },
            },
            pictureUrl: { type: String },
        },
        pictureuploadreadAccompany: { type: Boolean, default: false },
    },
    adminVerification: {
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
        },
        adminEmail: { type: String },
        adminRemarks: { type: String },
        verifiedDate: { type: Date },
        verificationRequestDate: { type: Date, default: Date.now },
    },
    termsandcond: { type: Boolean, default: false },
    biographyguidelinesread: { type: Boolean, default: false },
    privacypolicyready: { type: Boolean, default: false },
    pictureuploadread: { type: Boolean, default: false },
    isVerifiedByAdmin: { type: Boolean, default: false },
    email: { type: String },
    password: { type: String },
    isAdmin: { type: Boolean, default: false },
    attendance: [{
        date: { type: Date, default: Date.now },
        status: { type: Boolean },
    }, ],
    qrCode: { type: String },
    sessionsAttended: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
    }, ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;