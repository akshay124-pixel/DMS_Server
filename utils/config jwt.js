const jwt = require("jsonwebtoken");
const secretKey = require("../utils/config cypt");
function generateToken(user) {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, secretKey, { expiresIn: "30d" });
}
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    console.log("verifyToken: Decoded token:", {
      id: decoded.id,
      role: decoded.role,
    });
    req.user = decoded;
    next();
  } catch (error) {
    console.error("verifyToken Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { generateToken, verifyToken };
