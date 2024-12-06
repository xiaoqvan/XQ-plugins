import axios from "axios";
import UserAgent from "user-agents";
import log from "#logger";

const userAgent = new UserAgent();
// 解析分享链接中的视频ID
async function parseVideoId(shareLink) {
  let videoId;
  if (shareLink.includes("douyin.com/video/")) {
    // 处理电脑网页版分享链接
    videoId = shareLink.split("/video/")[1];
  } else if (shareLink.includes("v.douyin.com")) {
    // 处理抖音APP分享链接
    try {
      const response = await axios.get(shareLink, {
        maxRedirects: 0,
        validateStatus: null,
        headers: {
          "User-Agent": userAgent.toString(),
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
          log.error(`重定向URL不包含视频、笔记或幻灯片ID: ${redirectedUrl}`);
        }
      }
    } catch (error) {
      log.error(`重定向链接出错: ${error.message}`);
    }
  }
  return videoId;
}

// 获取视频的详细信息
async function getVideoInfo(videoId) {
  try {
    const videoInfoUrl = `https://www.iesdouyin.com/share/video/${videoId}/`;
    const response = await axios.get(videoInfoUrl, {
      headers: {
        "User-Agent": userAgent.toString(),
      },
    });
    const htmlContent = response.data;
    const jsonDataMatch = htmlContent.match(
      /window\._ROUTER_DATA\s*=\s*(.*?)<\/script>/
    );
    if (jsonDataMatch) {
      const jsonData = JSON.parse(jsonDataMatch[1]);
      const loaderData = jsonData.loaderData;
      let originalVideoInfo;

      if ("video_(id)/page" in loaderData) {
        originalVideoInfo = loaderData["video_(id)/page"].videoInfoRes;
      } else if ("note_(id)/page" in loaderData) {
        originalVideoInfo = loaderData["note_(id)/page"].videoInfoRes;
      } else if ("slides_(id)/page" in loaderData) {
        originalVideoInfo = loaderData["slides_(id)/page"].videoInfoRes;
      } else {
        throw new Error("无法解析视频、笔记或幻灯片信息");
      }

      if (originalVideoInfo.item_list.length === 0) {
        throw new Error("无法解析视频信息");
      }

      const data = originalVideoInfo.item_list[0];

      const images = [];
      if (data.images && Array.isArray(data.images)) {
        data.images.forEach((img) => {
          if (
            img.url_list &&
            Array.isArray(img.url_list) &&
            img.url_list.length > 0
          ) {
            images.push(img.url_list[0]);
          }
        });
      }

      let videoUrl = "";
      if (data.video && data.video.play_addr && data.video.play_addr.url_list) {
        videoUrl = data.video.play_addr.url_list[0].replace("playwm", "play");
      }

      // 如果图集地址不为空时，因为没有视频，上面抖音返回的视频地址无法访问，置空处理
      if (images.length > 0) {
        videoUrl = "";
      }

      let videoMp4Url = "";
      if (videoUrl) {
        videoMp4Url = await getFinalVideoUrl(videoUrl);
      }

      return {
        video_url: videoMp4Url,
        cover_url: data.video.cover.url_list[0],
        title: data.desc,
        images: images,
        author: {
          uid: data.author.sec_uid,
          name: data.author.nickname,
          avatar: data.author.avatar_thumb.url_list[0],
        },
      };
    }
  } catch (error) {
    log.error(`获取视频信息时出错: ${error.message}`);
    throw error;
  }
}

// 获取视频的最终播放地址
async function getFinalVideoUrl(videoUrl) {
  try {
    const response = await axios.get(videoUrl, {
      maxRedirects: 0,
      validateStatus: null,
      headers: {
        "User-Agent": userAgent.toString(),
      },
    });
    return response.headers.location || videoUrl;
  } catch (error) {
    log.error(`获取视频的最终播放地址: ${error.message}`);
    throw error;
  }
}

(async () => {})();

const DouYin = async (url) => {
  log.debug(`收到链接: ${url}`);

  const validUrlPattern =
    /^(https?:\/\/)?(www\.)?(douyin\.com|v\.douyin\.com)\/.+/;
  if (!validUrlPattern.test(url)) {
    log.error("无效的链接格式");
    throw new Error("无效的链接格式");
  }

  try {
    const shareLink = url;

    const videoId = await parseVideoId(shareLink);

    const videoInfo = await getVideoInfo(videoId);

    log.debug(`获取到的抖音视频信息: ${JSON.stringify(videoInfo)}`);
    return videoInfo;
  } catch (error) {
    log.error(`获取抖音视频信息时出错: ${error.message}`);
    throw error;
  }
};

export default DouYin;

// Based on the following code change
// https://github.com/wujunwei928/parse-video-py/blob/main/parser/douyin.py
