const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key";

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải chứa ít nhất 6 ký tự" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Tài khoản đã tồn tại" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        totalAnswered: user.totalAnswered,
        totalCorrect: user.totalCorrect,
        selectedTestIndex: user.selectedTestIndex,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: "Lỗi hệ thống trong quá trình đăng ký" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        totalAnswered: user.totalAnswered,
        totalCorrect: user.totalCorrect,
        selectedTestIndex: user.selectedTestIndex,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi hệ thống trong quá trình đăng nhập" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Lỗi lấy thông tin cá nhân:", error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
