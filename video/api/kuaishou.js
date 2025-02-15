import axios from "axios";
import UserAgent from "user-agents";
import fs from "fs";

const userAgent = new UserAgent();

async function parseVideoId(shareLink) {
  let redirectedUrl = shareLink;
  let videoInfo;
  let shouldContinue = true;

  while (shouldContinue) {
    videoInfo = await axios.get(redirectedUrl, {
      headers: {
        "User-Agent": userAgent.toString(),
      },
    });

    redirectedUrl = videoInfo.request.res.responseUrl;

    if (redirectedUrl.includes("/fw/long-video/")) {
      redirectedUrl = redirectedUrl.replace("/fw/long-video/", "/fw/photo/");
    } else {
      shouldContinue = false;
    }
  }
  // console.log(videoInfo.data);

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
        images: url,
        img_backup: backupUrl,
        author: {
          uid: userEid,
          name: userName,
        },
      };
      return photoinfo;
    } else {
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
          video_url: selectedRepresentation.url,
          backup_url: selectedRepresentation.backupUrl,
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
    throw new Error(`${error.message}`);
  }
}

const isValidKuaishouUrl = (url) => {
  const pattern = /^https?:\/\/(?:v\.|www\.)?kuaishou\.com\/.+$/;
  return pattern.test(url);
};

const Kuaishou = async (url) => {
  if (!isValidKuaishouUrl(url)) {
    throw new Error("无效的快手分享链接");
  }

  try {
    const videoData = await parseVideoId(url);
    fs.writeFile("file.html", videoData, "utf8", (err) => {
      if (err) console.error("写入失败喵~", err);
      else console.log("写入成功喵~(=^･ω･^=)");
    });
    const videoInfo = extractVideoInfo(videoData);
    return videoInfo;
  } catch (error) {
    throw new Error(error.message);
  }
};

export default Kuaishou;
