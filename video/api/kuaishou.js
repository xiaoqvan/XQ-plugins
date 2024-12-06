import axios from "axios";
import UserAgent from "user-agents";

const userAgent = new UserAgent();

async function parseVideoId(shareLink) {
  let redirectedUrl = shareLink;
  let videoInfo;

  do {
    videoInfo = await axios.get(redirectedUrl, {
      headers: {
        "User-Agent": userAgent.toString(),
      },
      maxRedirects: 5, // 设置最大重定向次数
    });

    redirectedUrl = videoInfo.request.res.responseUrl;

    if (redirectedUrl.includes("/fw/long-video/")) {
      redirectedUrl = redirectedUrl.replace("/fw/long-video/", "/fw/photo/");
    } else {
      break;
    }
  } while (true);

  return videoInfo.data;
}

function extractVideoInfo(html) {
  try {
    const scriptRegex = /<script>window\.INIT_STATE\s*=\s*(\{.*?\})<\/script>/s;
    const match = html.match(scriptRegex);

    if (!match) {
      throw new Error("请求无视频数据");
    }

    const jsonData = match[1];
    const data = JSON.parse(jsonData);
    const key = Object.keys(data).find((k) => data[k]?.photo);
    const photoData = data[key].photo;
    const userEid = photoData.userEid || null;
    const userName = photoData.userName || null;
    const caption = photoData.caption || "";
    if (!photoData?.manifest) {
      const photojson = photoData.ext_params.atlas;
      const mainCdn = photojson.cdnList[0].cdn;
      const backupCdn = photojson.cdnList[1].cdn;

      const url = photojson.list.map((item) => `https://${mainCdn}${item}`);
      const backupUrl = photojson.list.map(
        (item) => `https://${backupCdn}${item}`
      );

      const photoinfo = {
        title: caption,
        url: url,
        backupUrl: backupUrl,
        author: {
          uid: userEid,
          name: userName,
        },
      };
      return photoinfo;
    } else {
      console.log(`视频`);
      const adaptationSet = photoData?.manifest?.adaptationSet;
      if (adaptationSet[0].representation) {
        const representations = adaptationSet[0].representation;
        let selectedRepresentation = representations.find(
          (rep) => rep.videoCodec === "hevc"
        );

        if (!selectedRepresentation) {
          selectedRepresentation = representations.find(
            (rep) => rep.videoCodec === "avc"
          );
        }

        const videoInfo = {
          title: caption,
          url: url,
          backupUrl: backupUrl,
          fileSize: selectedRepresentation.fileSize,
          videoCodec: selectedRepresentation.videoCodec,
          author: {
            uid: userEid,
            name: userName,
          },
        };
        return videoInfo;
      }
    }

    return null;
  } catch (error) {
    throw error;
  }
}

const isValidKuaishouUrl = (url) => {
  const pattern = /^https?:\/\/(?:v\.)?kuaishou\.com\/.+$/;
  return pattern.test(url);
};

const Kuaishou = async (url) => {
  if (!isValidKuaishouUrl(url)) {
    throw new Error("无效的快手分享链接");
  }
  try {
    const videoData = await parseVideoId(url);
    const videoInfo = extractVideoInfo(videoData);
    return videoInfo;
  } catch (error) {
    throw new Error(error.message);
  }
};

export default Kuaishou;
