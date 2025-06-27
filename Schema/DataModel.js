const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  customerName: {
    type: String,

    trim: true,
  },
  contactName: {
    type: String,

    trim: true,
  },
  email: {
    type: String,

    trim: true,
    lowercase: true,
  },
  mobileNumber: {
    type: String,

    trim: true,
    match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
  },
  AlterNumber: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
  },
  product: {
    type: String,

    enum: {
      values: ["Ed-Tech", "Furniture", "AV"],
      message: "Product must be either 'Ed-Tech', 'Furniture', or 'AV'",
    },
    trim: true,
  },
  address: {
    type: String,

    trim: true,
    minlength: [5, "Address must be at least 5 characters"],
    maxlength: [200, "Address cannot exceed 200 characters"],
  },
  organization: {
    type: String,

    trim: true,

    maxlength: [100, "Organization cannot exceed 100 characters"],
  },
  category: {
    type: String,

    enum: {
      values: ["Private", "Government"],
      message: "Category must be either 'Private' or 'Government'",
    },
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: {
      values: [
        "Interested",
        "Not Interested",
        "Maybe",
        "Closed",
        "Not",
        "Service",
        "Not Found",
      ],
      message:
        "Status must be either 'Interested', 'Not Interested', 'Maybe', or 'Not Found'",
    },
    default: "Not Found",
  },
  closetype: {
    type: String,
    enum: ["Closed Won", "Closed Lost", ""],
    default: "",
  },
  closeamount: { type: Number, min: 0 },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, "Remarks cannot exceed 500 characters"],
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Created by user is required"],
  },
});

EntrySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Entry = mongoose.model("Entry", EntrySchema);

module.exports = Entry;
