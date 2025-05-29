const mongoose = require("mongoose");
const Entry = require("../Schema/DataModel");
const User = require("../Schema/Model");
const XLSX = require("xlsx");

// DataentryLogic - Create a single entry
const DataentryLogic = async (req, res) => {
  try {
    const {
      customerName,
      mobileNumber,
      AlterNumber,
      email,
      address,
      state,
      city,
      product,
      organization,
      category,
      status,
      remarks,
    } = req.body;

    // Validate required fields (excluding state and city)
    const requiredFields = {
      customerName,
      email,
      mobileNumber,
      AlterNumber,
      address,
      product,
      organization,
      category,
    };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `${
            field.charAt(0).toUpperCase() + field.slice(1)
          } is required and must be a non-empty string.`,
        });
      }
    }

    // Validate product
    const validProducts = ["Ed-Tech", "Furniture", "AV"];
    if (!validProducts.includes(product.trim())) {
      return res.status(400).json({
        success: false,
        message: "Product must be one of 'Ed-Tech', 'Furniture', or 'AV'.",
      });
    }

    const newEntry = new Entry({
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      AlterNumber: AlterNumber.trim(),
      email: email.trim(),
      address: address.trim(),
      product: product.trim(),
      // Include state and city without validation, default to empty string if undefined
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      organization: organization.trim(),
      category: category.trim(),
      createdBy: req.user.id,
      ...(status && { status }),
      ...(remarks && { remarks: remarks.trim() }),
    });

    await newEntry.save();

    res.status(201).json({
      success: true,
      data: newEntry,
      message: "Entry created successfully.",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    console.error("Error in DataentryLogic:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// exportentry - Export entries to XLSX (filtered by role)
const exportentry = async (req, res) => {
  try {
    let entries;
    if (req.user.role === "Admin") {
      entries = await Entry.find().lean();
    } else {
      entries = await Entry.find({ createdBy: req.user.id }).lean();
    }

    const formattedEntries = entries.map((entry) => ({
      customerName: entry.customerName,
      mobileNumber: entry.mobileNumber,
      AlterNumber: entry.AlterNumber,
      email: entry.email,
      address: entry.address,
      state: entry.state,
      city: entry.city,
      product: entry.product,
      organization: entry.organization,
      category: entry.category,
      status: entry.status || "Not Found",
      createdAt: entry.createdAt.toLocaleDateString(),

      remarks: entry.remarks || "Not Found",
    }));

    const ws = XLSX.utils.json_to_sheet(formattedEntries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Entries");

    const fileBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", "attachment; filename=entries.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error exporting entries:", error.message);
    res.status(500).json({
      success: false,
      message: "Error exporting entries",
      error: error.message,
    });
  }
};

// fetchEntries - Fetch entries based on role
const fetchEntries = async (req, res) => {
  try {
    let entries;
    if (req.user.role === "Admin") {
      entries = await Entry.find().populate("createdBy", "username").lean();
    } else {
      entries = await Entry.find({ createdBy: req.user.id })
        .populate("createdBy", "username")
        .lean();
    }
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch entries",
      error: error.message,
    });
  }
};

// DeleteData - Delete a single entry (only if created by user or admin)
const DeleteData = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid entry ID" });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    if (
      req.user.role !== "Admin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Entry.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete entry",
      error: error.message,
    });
  }
};

// editEntry - Update an entry (only if created by user or admin)
const editEntry = async (req, res) => {
  try {
    const {
      customerName,
      mobileNumber,
      AlterNumber,
      email,
      address,
      state,
      city,
      product,
      organization,
      category,
      status,
      remarks,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid entry ID" });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    if (
      req.user.role !== "Admin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Validate product if provided
    if (product !== undefined) {
      const validProducts = ["Ed-Tech", "Furniture", "AV"];
      if (!validProducts.includes(product.trim())) {
        return res.status(400).json({
          success: false,
          message: "Product must be one of 'Ed-Tech', 'Furniture', or 'AV'.",
        });
      }
    }

    const updateData = {
      ...(customerName !== undefined && { customerName: customerName.trim() }),
      ...(mobileNumber !== undefined && { mobileNumber: mobileNumber.trim() }),
      ...(AlterNumber !== undefined && { AlterNumber: AlterNumber.trim() }),
      ...(email !== undefined && { email: email.trim() }),
      ...(address !== undefined && { address: address.trim() }),
      ...(state !== undefined && { state: state.trim() }),
      ...(city !== undefined && { city: city.trim() }),
      ...(product !== undefined && { product: product.trim() }),
      ...(organization !== undefined && { organization: organization.trim() }),
      ...(category !== undefined && { category: category.trim() }),
      ...(status !== undefined && { status }),

      ...(remarks !== undefined && { remarks: remarks ? remarks.trim() : "" }),
    };

    const updatedEntry = await Entry.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    res.status(200).json({
      success: true,
      data: updatedEntry,
      message: "Entry updated successfully",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    console.error("Error in editEntry:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating entry",
      error: error.message,
    });
  }
};

// bulkUploadStocks - Bulk upload entries
const bulkUploadStocks = async (req, res) => {
  try {
    const newEntries = req.body;

    if (!Array.isArray(newEntries) || newEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Array of entries expected.",
      });
    }

    // Map entries to match the export format exactly
    const validatedEntries = newEntries.map((entry) => {
      const createdAt = new Date();
      const updatedAt = new Date();

      return {
        customerName: entry["Customer Name"] || "",
        email: entry["Email"] || "",
        mobileNumber: entry["Contact Number"] || "",
        AlterNumber: entry["Alternate Number"] || "",
        product: entry["Product"] || "",
        address: entry["Address"] || "",
        organization: entry["Organization"] || "",
        category: entry["Category"] || "",
        city: entry["District"] || "",
        state: entry["State"] || "",
        status: entry["Status"] || "Not Found",
        remarks: entry["Remarks"] || "",
        createdAt,
        updatedAt,
        createdBy: req.user.id, // Set createdBy to the authenticated user
      };
    });

    const batchSize = 500;
    let insertedCount = 0;
    const errors = [];

    for (let i = 0; i < validatedEntries.length; i += batchSize) {
      const batch = validatedEntries.slice(i, i + batchSize);
      try {
        await Entry.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
      } catch (batchError) {
        errors.push(`Batch ${i / batchSize + 1}: ${batchError.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: `Partially uploaded ${insertedCount} entries`,
        errors,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${insertedCount} entries!`,
    });
  } catch (error) {
    console.error("Error in bulk upload:", error.message);
    res.status(400).json({
      success: false,
      message: `Failed to upload entries: ${error.message}`,
    });
  }
};
// getAdmin - Check if user is admin
const getAdmin = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No user found" });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, isAdmin: user.role === "Admin" });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  bulkUploadStocks,
  DataentryLogic,
  fetchEntries,
  DeleteData,
  editEntry,
  exportentry,
  getAdmin,
};
