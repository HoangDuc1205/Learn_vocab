const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Token is in format 'Bearer <token>'
  const tokenParts = authHeader.split(" ");
  if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
    return res.status(401).json({ message: "Token format is invalid, must be Bearer <token>" });
  }

  const token = tokenParts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");
    req.user = decoded; // The payload contains { id }
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
