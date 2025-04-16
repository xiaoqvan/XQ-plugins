import os from "os";
import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import UserAgent from "user-agents";

let executablePath;
if (os.platform() === "win32") {
  executablePath =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
} else {
  try {
    executablePath = execSync("which chromium-browser").toString().trim();
    if (!executablePath) {
      throw new Error("chromium-browser not found in PATH");
    }
  } catch (error) {
    console.error(`Error getting chromium-browser path: ${error.message}`);
    throw error;
  }
}

class BrowserManager {
  static async createBrowser(options = {}) {
    const defaultOptions = {
      executablePath,
      headless: true,
      args: ["--no-sandbox"],
      ...options,
    };

    return await puppeteer.launch(defaultOptions);
  }

  static async createIncognitoPage(browser, options = {}) {
    const context = await browser.createBrowserContext();
    await context.deleteCookie();
    const page = await context.newPage();

    // 设置反爬虫检测
    await page.evaluate(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });
      delete navigator.webdriver;
    });

    await page.evaluate(() => {
      Object.defineProperty(navigator, "platform", {
        get: () => "Win32",
      });
    });

    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };
    });

    // 设置 User-Agent
    const ua = new UserAgent({
      deviceCategory: options.deviceCategory || "desktop",
      platform: options.platform || "Win32",
    }).toString();

    await page.setUserAgent(ua);

    return page;
  }

  static async createPage(browser, options = {}) {
    const page = await browser.newPage();

    const ua = new UserAgent({
      deviceCategory: options.deviceCategory || "desktop",
      platform: options.platform || "Win32",
    }).toString();

    await page.setUserAgent(ua);
    return page;
  }
}

export { BrowserManager, puppeteer };
