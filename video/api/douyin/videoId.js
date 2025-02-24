import { BrowserManager } from "../../../api/browser.js";

export async function getDouYinVideoId(url) {
  const browser = await BrowserManager.createBrowser({
    args: [
      "--no-sandbox",
      "--incognito",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const incognitoPage = await BrowserManager.createIncognitoPage(browser);

  let maxLengthCookie = "";
  let responseContent = "";
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

  incognitoPage.on("response", async (response) => {
    if (response.url().includes("www.douyin.com/aweme/v1/web/aweme/detail/")) {
      try {
        const content = await response.text();
        if (content && content !== "") {
          // 处理转义字符，将字符串转换为标准JSON
          responseContent = JSON.parse(content);
        }
      } catch (error) {
        console.error("获取响应内容失败:", error);
      }
    }
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
    await incognitoPage.reload({
      waitUntil: ["networkidle2"],
      timeout: 60000,
    });

    await browser.close();

    return { videoId, cookies: maxLengthCookie, response: responseContent };
  } else {
    console.error("未能提取视频ID");
    await browser.close();
    return { videoId: null, cookies: "", response: null };
  }
}

// (async () => {
//   const shareLink = "";
//   const { videoId, cookies } = await getDouYinVideoId(shareLink);
//   console.log("视频ID:", videoId);
//   console.log("Cookies长度:", cookies.length);
// })();
