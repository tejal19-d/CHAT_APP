import jwt from "jsonwebtoken";
import Session from "../models/session.model.js";

const parseUserAgent = (userAgentString) => {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let deviceName = "Web Session";

  if (!userAgentString) return { browser, os, deviceName };

  if (userAgentString.includes("Firefox")) browser = "Firefox";
  else if (userAgentString.includes("Chrome") && !userAgentString.includes("Chromium")) browser = "Chrome";
  else if (userAgentString.includes("Safari") && !userAgentString.includes("Chrome")) browser = "Safari";
  else if (userAgentString.includes("Edge")) browser = "Edge";

  if (userAgentString.includes("Windows")) os = "Windows";
  else if (userAgentString.includes("Macintosh")) os = "MacOS";
  else if (userAgentString.includes("Linux")) os = "Linux";
  else if (userAgentString.includes("Android")) os = "Android";
  else if (userAgentString.includes("iPhone") || userAgentString.includes("iPad")) os = "iOS";

  deviceName = `${os} Device`;

  return { browser, os, deviceName };
};

export const generateToken = async (userId, res, req = null) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || "refresh_secret_key", {
    expiresIn: "7d",
  });

  // Set legacy token for backwards compatibility
  res.cookie("jwt", accessToken, {
    maxAge: 15 * 60 * 1000, // 15 mins
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  // Set new tokens
  res.cookie("accessToken", accessToken, {
    maxAge: 15 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  if (req) {
    const userAgent = req.headers["user-agent"];
    const { browser, os, deviceName } = parseUserAgent(userAgent);
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    await Session.create({
      userId,
      token: refreshToken,
      deviceName,
      browser,
      os,
      ipAddress,
    });
  }

  return accessToken;
};
