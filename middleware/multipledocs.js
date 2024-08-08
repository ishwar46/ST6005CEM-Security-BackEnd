const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Define storage for various image types including banner images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;

        switch (file.fieldname) {
            case "paymentReceipt":
                uploadPath = "public/uploads/paymentReceipts";
                break;
            case "userimage":
                uploadPath = "public/uploads/userimage";
                break;
            case "accompanyingimages":
                uploadPath = "public/uploads/accompanyingimages";
                break;
            case "bannerimage":
                uploadPath = "public/uploads/bannerimages";
                break;
            default:
                uploadPath = "public/uploads/others";
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const randomString = crypto.randomBytes(8).toString("hex");
        const prefix = file.fieldname;
        cb(null, `${prefix}-${Date.now()}-${randomString}${ext}`);
    },
});

// File filter for images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
    ];
    if (!allowedFileTypes.includes(file.mimetype)) {
        return cb(new Error("File format not supported."), false);
    }
    cb(null, true);
};

const storageConfig = multer({
    storage: storage,
    fileFilter: fileFilter,
});

const upload = storageConfig.fields([
    { name: "userimage", maxCount: 1 },
    { name: "accompanyingimages", maxCount: 1 },
    { name: "paymentReceipt", maxCount: 1 },
    { name: "bannerimage", maxCount: 1 },
]);

module.exports = upload;