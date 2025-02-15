import axios from "axios";
import UserAgent from "user-agents";

const userAgent = new UserAgent();
async function parseVideoId(shareLink) {
  if (!shareLink.includes("h5.pipix.com")) {
    throw new Error("非有效的ppx分享链接");
  }

  try {
    // For direct item URLs
    if (shareLink.includes("/item/")) {
      const match = shareLink.match(/\/item\/(\d+)/);
      if (match) return match[1];
    }

    // For shortened URLs that need redirection
    const response = await axios.get(shareLink, {
      headers: {
        "User-Agent": userAgent.toString(),
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const redirectUrl = response.request.res.responseUrl || response.config.url;
    const match = redirectUrl.match(/\/item\/(\d+)/);
    if (match) {
      return match[1];
    }

    throw new Error("未找到视频ID");
  } catch (error) {
    throw new error();
  }
}
async function getVideoInfo(videoId) {
  const apiUrl = `https://api5-hl.pipix.com/bds/cell/cell_comment/?cell_id=${videoId}&aid=1319&app_name=super&version_code=507`;
  console.log(apiUrl);
  let videoInfo;

  const response = await axios.get(apiUrl, {
    headers: {
      "User-Agent": userAgent.toString(),
    },
  });

  const data = response.data;
  if (!data.data.cell_comments[0].comment_info.item.video) {
    console.log("没有视频信息");
    videoInfo = {
      title: data.data.cell_comments[0].comment_info.item.note.text,
      images: data.data.cell_comments[0].comment_info.item.note.multi_image.map(
        (image) => image.download_list[0].url
      ),
      author: {
        uid: data.data.cell_comments[0].comment_info.item.author.id,
        name: data.data.cell_comments[0].comment_info.item.author.name,
        avatar:
          data.data.cell_comments[0].comment_info.item.author.avatar
            .download_list[0].url,
      },
    };
    return videoInfo;
  } else {
    videoInfo = {
      title: data.data.cell_comments[0].comment_info.item.video.text,
      video_url:
        data.data.cell_comments[0].comment_info.item.video.video_high
          .url_list[0].url,
      cover_url:
        data.data.cell_comments[0].comment_info.item.video.cover_image
          .download_list[0].url,
      author: {
        uid: data.data.cell_comments[0].comment_info.item.author.id,
        name: data.data.cell_comments[0].comment_info.item.author.name,
        avatar:
          data.data.cell_comments[0].comment_info.item.author.avatar
            .download_list[0].url,
      },
    };
    // console.log(videoInfo);
    return videoInfo;
  }
}

const pipix = async (url) => {
  try {
    const videoId = await parseVideoId(url);

    const videoInfo = getVideoInfo(videoId);
    return videoInfo;
  } catch (error) {
    throw new Error(error.message);
  }
};
export default pipix;
