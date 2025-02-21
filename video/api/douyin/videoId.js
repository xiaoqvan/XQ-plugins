import os from "os";
let puppeteer;
if (os.platform() === "android") {
  puppeteer = await import("puppeteer-core");
} else {
  puppeteer = await import("puppeteer");
}
import { execSync } from "child_process";
import UserAgent from "user-agents";

let executablePath;
if (os.platform() === "android") {
  try {
    executablePath = execSync("which chromium-browser").toString().trim();
    if (!executablePath) {
      throw new Error("chromium-browser not found in PATH");
    }
  } catch (error) {
    throw new error();
  }
}

export async function getDouYinVideoId(url) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.createBrowserContext();
  const incognitoPage = await context.newPage();

  const ua = new UserAgent({ deviceCategory: "desktop" }).toString();
  await incognitoPage.setUserAgent(ua);

  let maxLengthCookie = "";
  await incognitoPage.setRequestInterception(true);
  incognitoPage.on("request", (request) => {
    if (request.url().includes("www.douyin.com/aweme/v1/web/aweme/detail/")) {
      const cookies = request.headers()["cookie"];
      if (cookies && cookies !== "") {
        if (cookies.length > maxLengthCookie.length) {
          maxLengthCookie = cookies;
        }
      }
    }
    request.continue();
  });
  // 请求URL并进行多级跳转
  await incognitoPage.goto(url, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  const redirectedUrl = await incognitoPage.url();
  const match = redirectedUrl.match(/\/video\/(\d+)/);
  if (match && match[1]) {
    const videoId = match[1];
    // console.log("视频ID:", videoId);
    await incognitoPage.reload({
      waitUntil: ["load"],
      timeout: 60000,
    });

    await browser.close();

    return { videoId, cookies: maxLengthCookie };
  } else {
    console.error("未能提取视频ID");
    await browser.close();
    return { videoId: null, cookies: "" };
  }
}

// (async () => {
//   const shareLink = "";
//   const { videoId, cookies } = await getDouYinVideoId(shareLink);
//   console.log("视频ID:", videoId);
//   console.log("Cookies长度:", cookies.length);
// })();
