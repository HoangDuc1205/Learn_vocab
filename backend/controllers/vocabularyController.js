const User = require("../models/User");
const Vocabulary = require("../models/Vocabulary");

exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Get words
    const words = await Vocabulary.find({ user: userId }).sort({ wordId: 1 });

    // Format words to match frontend schema
    const formattedWords = words.map(w => ({
      id: w.wordId,
      term: w.term,
      definition: w.definition,
      synonym: w.synonym,
      ipa: w.ipa || undefined,
      status: w.status,
      consecutiveCorrect: w.consecutiveCorrect,
      totalCorrect: w.totalCorrect,
      totalWrong: w.totalWrong
    }));

    res.status(200).json({
      totalAnswered: user.totalAnswered,
      totalCorrect: user.totalCorrect,
      selectedTestIndex: user.selectedTestIndex,
      words: formattedWords
    });
  } catch (error) {
    console.error("Lỗi lấy tiến độ học:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi lấy tiến độ" });
  }
};

exports.syncUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalAnswered, totalCorrect, selectedTestIndex, words } = req.body;

    // 1. Update user stats
    await User.findByIdAndUpdate(userId, {
      totalAnswered: Number(totalAnswered) || 0,
      totalCorrect: Number(totalCorrect) || 0,
      selectedTestIndex: Number(selectedTestIndex) || 0
    });

    // 2. Bulk upsert words progress if any words are provided
    if (Array.isArray(words) && words.length > 0) {
      const ops = words.map(word => ({
        updateOne: {
          filter: { user: userId, wordId: word.id },
          update: {
            $set: {
              term: word.term,
              definition: word.definition,
              synonym: word.synonym || "",
              ipa: word.ipa || "",
              status: word.status,
              consecutiveCorrect: word.consecutiveCorrect,
              totalCorrect: word.totalCorrect,
              totalWrong: word.totalWrong
            }
          },
          upsert: true
        }
      }));

      await Vocabulary.bulkWrite(ops);
    }

    res.status(200).json({ message: "Đồng bộ tiến trình thành công" });
  } catch (error) {
    console.error("Lỗi đồng bộ tiến trình:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi đồng bộ tiến trình" });
  }
};
