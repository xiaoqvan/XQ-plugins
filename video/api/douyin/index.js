import { getDouYin } from "./getvideo.js";
/**
 * 解析抖音分享链接并获取视频信息
 * @param {string} url - 抖音分享链接
 * @returns {object} - 视频信息
 */
const DouYin = async (url) => {
  // console.log(`收到链接: ${url}`);

  const validUrlPattern =
    /^(https?:\/\/)?(www\.)?(douyin\.com|v\.douyin\.com)\/.+/;
  if (!validUrlPattern.test(url)) {
    throw new Error("无效的链接格式");
  }

  try {
    const shareLink = url;
    const videoInfo = await getDouYin(shareLink);

    // console.log(`获取到的抖音视频信息: ${JSON.stringify(videoInfo)}`);
    return videoInfo;
  } catch (error) {
    throw new Error(`获取抖音视频信息时出错: ${error.message}`);
  }
};

export default DouYin;
