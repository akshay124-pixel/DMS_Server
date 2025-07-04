const mongoose = require("mongoose");
const Entry = require("../Schema/DataModel");
const User = require("../Schema/Model");
const XLSX = require("xlsx");

// DataentryLogic - Create a single entry
const DataentryLogic = async (req, res) => {
  try {
    const {
      customerName,
      contactName,
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
      estimatedValue,
    } = req.body;

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
      contactName: contactName.trim(),
      AlterNumber: AlterNumber.trim(),
      email: email.trim(),
      address: address.trim(),
      product: product.trim(),
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      organization: organization.trim(),
      category: category.trim(),
      createdBy: req.user.id,
      ...(status && { status }),
      ...(remarks && { remarks: remarks.trim() }),
      ...(estimatedValue && {
        estimatedValue: parseFloat(estimatedValue) || null,
      }),
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

// Get Users
const getUsers = async (req, res) => {
  try {
    const normalizeRole = (role) =>
      role
        ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
        : "Others";
    const userRole = normalizeRole(req.user.role);
    console.log("getUsers: User ID:", req.user.id, "Role:", userRole);

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({
        success: false,
        errorCode: "INVALID_USER_ID",
        message: "Invalid user ID in token",
      });
    }

    let users;
    if (userRole === "Superadmin" || userRole === "Admin") {
      users = await User.find().select("_id username role").lean();
    } else {
      users = await User.find({ _id: req.user.id })
        .select("_id username role")
        .lean();
    }

    if (!users.length) {
      console.warn("No users found for role:", userRole);
      return res.status(404).json({
        success: false,
        errorCode: "NO_USERS_FOUND",
        message: "No users found.",
      });
    }

    const normalizedUsers = users.map((user) => ({
      _id: user._id.toString(),
      username: user.username || "Unknown",
      role: normalizeRole(user.role),
    }));

    console.log(
      "Returning users:",
      normalizedUsers.length,
      normalizedUsers.map((u) => ({ _id: u._id, role: u.role }))
    );
    res.status(200).json({
      success: true,
      data: normalizedUsers,
    });
  } catch (error) {
    console.error("getUsers Error:", error.message);
    res.status(500).json({
      success: false,
      errorCode: "SERVER_ERROR",
      message: "Failed to fetch users",
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
      contactName: entry.contactName,
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
    const normalizedRole =
      req.user.role.charAt(0).toUpperCase() +
      req.user.role.slice(1).toLowerCase();
    console.log("fetchEntries: User ID:", req.user.id, "Role:", normalizedRole);

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({
        success: false,
        errorCode: "INVALID_USER_ID",
        message: "Invalid user ID in token",
      });
    }

    let entries;
    if (normalizedRole === "Admin" || normalizedRole === "Superadmin") {
      entries = await Entry.find().populate("createdBy", "username _id").lean();
    } else {
      entries = await Entry.find({ createdBy: req.user.id })
        .populate("createdBy", "username _id")
        .lean();
    }

    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      _id: entry._id.toString(),
      createdBy: {
        _id: entry.createdBy?._id?.toString() || null,
        username: entry.createdBy?.username || "Unknown",
      },
    }));

    console.log(
      "Fetched entries count:",
      normalizedEntries.length,
      "User roles:",
      [
        ...new Set(
          normalizedEntries.map((e) => e.createdBy?.username || "Unknown")
        ),
      ]
    );
    res.status(200).json({
      success: true,
      data: normalizedEntries,
    });
  } catch (error) {
    console.error("Error fetching entries:", error.message);
    res.status(500).json({
      success: false,
      errorCode: "SERVER_ERROR",
      message: "Failed to fetch entries",
      error: error.message,
    });
  }
};
// DeleteData
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

    const normalizedRole =
      req.user.role.charAt(0).toUpperCase() +
      req.user.role.slice(1).toLowerCase();

    if (
      normalizedRole !== "Admin" &&
      normalizedRole !== "Superadmin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Entry delete karo
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
      contactName,
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
      closetype,
      closeamount,
      estimatedValue,
    } = req.body;

    console.log("Incoming payload:", req.body);

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

    const normalizedRole =
      req.user.role.charAt(0).toUpperCase() +
      req.user.role.slice(1).toLowerCase();
    if (
      normalizedRole !== "Admin" &&
      normalizedRole !== "Superadmin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

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
      ...(customerName !== undefined && {
        customerName: customerName.trim() || entry.customerName,
      }),
      ...(contactName !== undefined && {
        contactName: contactName.trim() || entry.contactName,
      }),
      ...(mobileNumber !== undefined && {
        mobileNumber: mobileNumber.trim() || entry.mobileNumber,
      }),
      ...(AlterNumber !== undefined && {
        AlterNumber: AlterNumber.trim() || entry.AlterNumber,
      }),
      ...(email !== undefined && { email: email.trim() || entry.email }),
      ...(address !== undefined && {
        address: address.trim() || entry.address,
      }),
      ...(state !== undefined && { state: state.trim() || "" }),
      ...(city !== undefined && { city: city.trim() || "" }),
      ...(product !== undefined && {
        product: product.trim() || entry.product,
      }),
      ...(organization !== undefined && {
        organization: organization.trim() || entry.organization,
      }),
      ...(category !== undefined && {
        category: category.trim() || entry.category,
      }),
      ...(status !== undefined && { status }),
      ...(remarks !== undefined && { remarks: remarks ? remarks.trim() : "" }),
      ...(estimatedValue !== undefined && {
        estimatedValue: parseFloat(estimatedValue) || null,
      }),
      updatedAt: new Date(),
    };

    if (status === "Closed") {
      if (
        !closetype ||
        !["Closed Won", "Closed Lost"].includes(closetype.trim())
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Close type must be 'Closed Won' or 'Closed Lost' when status is 'Closed'.",
        });
      }
      updateData.closetype = closetype.trim();
      updateData.closeamount = parseFloat(closeamount) || null;
    } else {
      updateData.closetype = "";
      updateData.closeamount = null;
    }
    console.log("Update data:", updateData);

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
      console.error("Validation errors:", messages);
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
        contactName: entry["Contact Person"] || "",
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
        createdBy: req.user.id,
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

    res.status(200).json({
      success: true,
      isAdmin: user.role === "Admin" || user.role === "Superadmin",
      isSuperadmin: user.role === "Superadmin",
    });
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
  getUsers,
};
