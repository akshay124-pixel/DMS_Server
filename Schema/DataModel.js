const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true,
    minlength: [1, "Customer name must be at least 1 character"],
    maxlength: [100, "Customer name cannot exceed 100 characters"],
  },
  email: {
    type: String,
    required: [true, "Customer email is required"],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email address",
    ],
    maxlength: [100, "Email cannot exceed 100 characters"],
  },
  mobileNumber: {
    type: String,
    required: [true, "Mobile number is required"],
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
    required: [true, "Product is required"],
    enum: {
      values: ["Ed-Tech", "Furniture", "AV"],
      message: "Product must be either 'Ed-Tech', 'Furniture', or 'AV'",
    },
    trim: true,
  },
  address: {
    type: String,
    required: [true, "Address is required"],
    trim: true,
    minlength: [5, "Address must be at least 5 characters"],
    maxlength: [200, "Address cannot exceed 200 characters"],
  },
  organization: {
    type: String,
    required: [true, "Organization is required"],
    trim: true,
    minlength: [1, "Organization must be at least 1 character"],
    maxlength: [100, "Organization cannot exceed 100 characters"],
  },
  category: {
    type: String,
    required: [true, "Category is required"],
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
      values: ["Interested", "Not Interested", "Maybe", "Not Found"],
      message:
        "Status must be either 'Interested', 'Not Interested', 'Maybe', or 'Not Found'",
    },
    default: "Not Found",
  },
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
