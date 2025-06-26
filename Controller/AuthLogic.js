const User = require("../Schema/Model");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/config jwt");
const jwt = require("jsonwebtoken");
const secretkey = require("../utils/config cypt");
// Signup Controller
const Signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred during signup." });
  }
};

// Login Controller
const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };
    console.log("Login: Generating token for user:", payload); // Debug log
    const token = jwt.sign(payload, secretkey, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === "Admin",
        isSuperadmin: user.role === "Superadmin",
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ message: "Server error during login" });
  }
};
const getUserRole = async (req, res) => {
  try {
    console.log("getUserRole: userId:", req.user.id, "role:", req.user.role); // Debug log
    return res.status(200).json({
      id: req.user.id,
      role: req.user.role,
      isAdmin: req.user.role === "Admin",
      isSuperadmin: req.user.role === "Superadmin",
    });
  } catch (error) {
    console.error("getUserRole Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch user role" });
  }
};

module.exports = { Signup, Login, getUserRole };
