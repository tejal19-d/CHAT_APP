import Session from "../models/session.model.js";

export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessions = await Session.find({ userId }).sort({ lastActiveTime: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error in getActiveSessions: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user._id;

    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    await Session.findByIdAndDelete(sessionId);
    res.status(200).json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Error in revokeSession: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentRefreshToken = req.cookies.refreshToken;

    // Delete all sessions for the user except the current active session
    await Session.deleteMany({ userId, token: { $ne: currentRefreshToken } });
    res.status(200).json({ message: "All other sessions revoked successfully" });
  } catch (error) {
    console.error("Error in revokeAllSessions: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
