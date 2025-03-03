// Modified from https://github.com/ShilongLee/Crawler/blob/main/service/douyin/logic/common.py

import UserAgent from "user-agents";
import axios from "axios";
import { getDouYinVideoId } from "./videoId.js";
import fs from "fs";
import yaml from "js-yaml";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const douyinJs = fs.readFileSync(join(__dirname, "douyin.js"), "utf-8");

// 创建沙箱环境
const sandbox = {};

// 使用 vm 模块在沙箱环境中执行 douyin.js
vm.createContext(sandbox);
vm.runInContext(douyinJs, sandbox);

const ua = new UserAgent({
  deviceCategory: "desktop",
  platform: "Win32",
}).toString();

const COMMON_PARAMS = {
  device_platform: "webapp",
  aid: "6383",
  channel: "channel_pc_web",
  update_version_code: "170400",
  pc_client_type: "1", //# Windows
  version_code: "190500",
  version_name: "19.5.0",
  cookie_enabled: "true",
  screen_width: "2560", //# from cookie dy_swidth
  screen_height: "1440", //# from cookie dy_sheight
  browser_language: "zh-CN",
  browser_platform: "Win32",
  browser_name: "Chrome",
  browser_version: "126.0.0.0",
  browser_online: "true",
  engine_name: "Blink",
  engine_version: "126.0.0.0",
  os_name: "Windows",
  os_version: "10",
  cpu_core_num: "24", //# device_web_cpu_core
  device_memory: "8", //# device_web_memory_size
  platform: "PC",
  downlink: "10",
  effective_type: "4g",
  round_trip_time: "50",
  // # 'webid': '7378325321550546458',//# from doc
  //# 'verifyFp': 'verify_lx6xgiix_cde2e4d7_7a43_e749_7cda_b5e7c149c780',//# from cookie s_v_web_id
  //# 'fp': 'verify_lx6xgiix_cde2e4d7_7a43_e749_7cda_b5e7c149c780', //# from cookie s_v_web_id
  //# 'msToken': 'hfAykirauBE-RKDm8bF2o2_cKuSdwHsbGXjJBuo8s3w9n46-Tu0CtxX7-iiZWZ8D7mRUAmRAkeiaU35194AJehc9u6_mei3Q9s_LABQuoANQmbd81DDS3wuA5u9UVIo%3D',  # from cookie msToken
  //# 'a_bogus': 'xJRwQfLfDkdsgDyh54OLfY3q66M3YQnV0trEMD2f5V3WF639HMPh9exLx-TvU6DjNs%2FDIeEjy4haT3nprQVH8qw39W4x%2F2CgQ6h0t-P2so0j53iJCLgmE0hE4vj3SlF85XNAiOk0y7ICKY00AInymhK4bfebY7Y6i6tryE%3D%3D' # sign
};

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "sec-ch-ua-platform": "Windows",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua":
    '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  referer: "https://www.douyin.com/?recommend=1",
  priority: "u=1, i",
  pragma: "no-cache",
  "cache-control": "no-cache",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  accept: "application/json, text/plain, */*",
  dnt: "1",
};

function getMsToken(randomLength = 120) {
  let randomStr = "";
  const baseStr =
    "ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789=";
  const length = baseStr.length - 1;

  for (let i = 0; i < randomLength; i++) {
    const randomIndex = Math.floor(Math.random() * (length + 1));
    randomStr += baseStr[randomIndex];
  }

  return randomStr;
}

async function getWebId(headers) {
  const url = "https://www.douyin.com/?recommend=1";

  headers["sec-fetch-dest"] = "document";
  try {
    const response = await axios.get(url, { headers: headers });
    if (response.status !== 200 || response.data === "") {
      console.error(
        `failed to get webid, url: ${url}, headers: ${JSON.stringify(headers)}`
      );
      return null;
    }
    const pattern = /\\"user_unique_id\\":\\"(\d+)\\"/;
    const match = response.data.match(pattern);
    if (match) {
      // console.log("webid:", match[1]);
      return match[1];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching URL: ${url}, ${error.message}`);
    return null;
  }
}

async function deal_params(params, headers) {
  const cookie = headers.cookie || headers.Cookie;
  if (!cookie) {
    return params;
  }
  const cookieDict = cookie.split(";").reduce((acc, curr) => {
    const [key, value] = curr.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});

  params.msToken = getMsToken();
  params.screen_width = cookieDict.dy_swidth || "2560";
  params.screen_height = cookieDict.dy_sheight || "1440";
  params.cpu_core_num = cookieDict.device_web_cpu_core || "24";
  params.device_memory = cookieDict.device_web_memory_size || "8";
  if (cookieDict.s_v_web_id === undefined) {
    console.log("cookie 中没有 s_v_web_id");
  }
  // console.log(cookieDict.s_v_web_id);
  // console.log(ua);
  params.verifyFp = cookieDict.s_v_web_id || null;
  params.fp = cookieDict.s_v_web_id || null;
  params.webid = await getWebId(headers);
  return params;
}

async function DouYin_request(id, cookies) {
  let params;
  params = { aweme_id: id, ...COMMON_PARAMS };
  const headers = { cookie: cookies, ...COMMON_HEADERS };
  params = await deal_params(params, headers);
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const a_bogus = sandbox.sign_datail(queryString, headers["User-Agent"]);
  params.a_bogus = a_bogus;
  //   console.log(headers);
  //   console.log(params);

  try {
    const url = `https://www.douyin.com/aweme/v1/web/aweme/detail/`;
    // console.log(url);

    const response = await axios.get(url, {
      params: params,
      headers: headers,
    });
    return response.data;
  } catch (error) {
    console.error("请求出错:", error.message);
    return null;
  }
}

async function parseVideoId(shareLink) {
  let videoId;
  if (shareLink.includes("douyin.com/video/")) {
    videoId = shareLink.split("/video/")[1];
  } else if (shareLink.includes("v.douyin.com")) {
    try {
      const response = await axios.get(shareLink, {
        maxRedirects: 0,
        validateStatus: null,
        headers: {
          "User-Agent": ua,
        },
      });
      const redirectedUrl = response.headers.location;
      if (redirectedUrl) {
        if (redirectedUrl.includes("/video/")) {
          videoId = redirectedUrl.split("/video/")[1].split("/")[0];
        } else if (redirectedUrl.includes("/note/")) {
          videoId = redirectedUrl.split("/note/")[1].split("/")[0];
        } else if (redirectedUrl.includes("/slides/")) {
          videoId = redirectedUrl.split("/slides/")[1].split("/")[0];
        } else {
          console.log("无法解析分享链接");
        }
      }
    } catch (error) {
      console.log("请求出错:", error.message);
    }
  }
  return videoId;
}

async function getcookies(shareLink) {
  // console.log("获取cookies");
  const video_id = await getDouYinVideoId(shareLink);
  return video_id;
}
function buildVideoInfo(data) {
  // 查找最佳视频质量
  let bestBitRateIndex = 0;
  let highestResolution = 0;
  let hasFPS60 = false;

  if (
    data.aweme_detail?.video?.bit_rate &&
    Array.isArray(data.aweme_detail.video.bit_rate) &&
    data.aweme_detail.video.bit_rate.length > 0
  ) {
    for (let i = 0; i < data.aweme_detail.video.bit_rate.length; i++) {
      const bitRate = data.aweme_detail.video.bit_rate[i];
      if (
        bitRate?.FPS === 60 &&
        bitRate?.play_addr?.url_list &&
        bitRate.play_addr.url_list.length > 0
      ) {
        bestBitRateIndex = i;
        hasFPS60 = true;
        const resolution =
          (bitRate.play_addr.height || 0) * (bitRate.play_addr.width || 0);
        if (resolution > highestResolution) {
          highestResolution = resolution;
          bestBitRateIndex = i;
        }
      }
    }

    if (!hasFPS60) {
      for (let i = 0; i < data.aweme_detail.video.bit_rate.length; i++) {
        const bitRate = data.aweme_detail.video.bit_rate[i];
        if (
          bitRate?.play_addr?.height &&
          bitRate?.play_addr?.width &&
          bitRate?.play_addr?.url_list &&
          bitRate.play_addr.url_list.length > 0
        ) {
          const resolution = bitRate.play_addr.height * bitRate.play_addr.width;
          if (resolution > highestResolution) {
            highestResolution = resolution;
            bestBitRateIndex = i;
          }
        }
      }
    }
  }

  const bestBitRate = data.aweme_detail?.video?.bit_rate?.[bestBitRateIndex];
  const videoUrl =
    bestBitRate?.play_addr?.url_list &&
    bestBitRate.play_addr.url_list.length > 0
      ? bestBitRate.play_addr.url_list[
          bestBitRate.play_addr.url_list.length - 1
        ]
      : null;

  const videoInfo = {
    video_id: data.aweme_detail?.aweme_id || null,
    title: data.aweme_detail?.desc || null,
    cover_url: data.aweme_detail?.video?.origin_cover?.url_list?.[0] || null,
    video: {
      video_url: videoUrl,
      fps: bestBitRate?.FPS || null,
      height: bestBitRate?.play_addr?.height || null,
      width: bestBitRate?.play_addr?.width || null,
    },
    author: {
      avatar: data.aweme_detail?.author?.avatar_thumb?.url_list?.[0] || null,
      name: data.aweme_detail?.author?.nickname || null,
      sec_uid: data.aweme_detail?.author?.sec_uid || null,
      uid: data.aweme_detail?.author?.uid || null,
    },
    music: {
      id: data.aweme_detail?.music?.id || null,
      id_str: data.aweme_detail?.music?.id_str || null,
      name: data.aweme_detail?.music?.title || null,
      url: data.aweme_detail?.music?.play_url?.url_list?.[0] || null,
      author: data.aweme_detail?.music?.author || null,
      sec_uid: data.aweme_detail?.music?.sec_uid || null,
      avatar: data.aweme_detail?.music?.avatar_large?.url_list?.[0] || null,
      cover: data.aweme_detail?.music?.cover_hd?.url_list?.[0] || null,
    },
    cooperation_info:
      data.aweme_detail?.cooperation_info?.co_creators?.map((creator) => ({
        avatar: creator?.avatar_thumb?.url_list?.[0] || null,
        nickname: creator?.nickname || null,
        role: creator?.role_title || null,
        uid: creator?.uid || null,
        sec_uid: creator?.sec_uid || null,
      })) || [],
  };
  return videoInfo;
}

export async function getDouYin(shareLink) {
  let cookies;
  let video_id;
  let data;
  try {
    cookies = yaml.load(
      fs.readFileSync(join(__dirname, "cookies.yaml"), "utf-8")
    );
    video_id = await parseVideoId(shareLink);
  } catch {
    console.log("cookies.yaml 不存在");
    const result = await getcookies(shareLink);
    cookies = result.cookies;
    video_id = result.videoId;
    if (result.response !== "") {
      data = result.response;
      // 保存新的 cookies 到文件
      try {
        fs.writeFileSync(
          join(__dirname, "cookies.yaml"),
          yaml.dump(result.cookies)
        );
      } catch (error) {
        console.log("保存 cookies.yaml 失败:", error.message);
      }
    }
  }
  // 只有在没有获取到 data 的情况下才发起请求
  if (!data) {
    data = await DouYin_request(video_id, cookies);
  }

  if (data === "") {
    // 最多重试2次
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      try {
        console.log(`请求失败重试第${retryCount + 1}次`);
        const retryData = await DouYin_request(video_id, cookies);
        if (retryData !== "") {
          const videoInfo = buildVideoInfo(retryData);
          return videoInfo;
        }
      } catch (error) {
        console.log(`第${retryCount + 1}次重试失败:`, error.message);
      }
      retryCount++;
    }

    // 重试2次后仍然失败，尝试更换cookie
    console.log("重试失败，尝试更换cookie...");
    try {
      const result = await getcookies(shareLink);
      cookies = result.cookies;
      if (result.response !== "") {
        data = result.response;
        // 保存新的 cookies 到文件
        try {
          fs.writeFileSync(
            join(__dirname, "cookies.yaml"),
            yaml.dump(result.cookies)
          );
        } catch (error) {
          console.log("保存 cookies.yaml 失败:", error.message);
        }
      } else {
        data = await DouYin_request(video_id, cookies);
      }
      if (data !== "") {
        const videoInfo = buildVideoInfo(data);
        return videoInfo;
      }
    } catch (error) {
      console.log("更换cookie后请求仍然失败:", error.message);
    }

    throw new Error("多次尝试后获取失败");
  }
  // fs.writeFileSync(
  //   join(__dirname, "videoInfo.json"),
  //   JSON.stringify(videoInfo)
  // );

  const videoInfo = buildVideoInfo(data);
  return videoInfo;
}
