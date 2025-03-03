import DouYin from "./api/douyin/index.js";
import Kuaishou from "./api/kuaishou.js";
import pipix from "./api/ppx.js";
import { Api } from "telegram";

// 抽取公共的发送媒体函数
async function sendMedia(client, chatId, result, caption) {
  if (result?.images) {
    const chunkSize = 10;
    const batches = [];
    for (let i = 0; i < result.images.length; i += chunkSize) {
      batches.push(result.images.slice(i, i + chunkSize));
    }
    for (const batch of batches) {
      const media = batch.map(
        (imageUrl) => new Api.InputMediaPhotoExternal({ url: imageUrl })
      );
      await client.sendFile(chatId, {
        file: media,
        caption: caption,
        parseMode: "html",
      });
    }
  } else {
    await client.sendMessage(chatId, {
      file: result.video?.video_url || result.video_url,
      message: caption,
      parseMode: "html",
    });
  }
}

// 统一的视频处理函数
async function handleVideo(client, event, platform, apiFunc, platformName) {
  const msg = event.message;
  const message = msg.message;
  const isChannel = msg.peerId.className === "PeerChannel";

  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;

  if (!url) {
    await client.sendMessage(event.chatId, {
      message: `请提供视频平台分享链接\n目前支持的格式:\n- ${platformName}\n /命令 <url>`,
    });
    return;
  }

  if (isChannel) {
    await client.deleteMessages(event.chatId, [msg.id], { revoke: true });
  }

  try {
    let getmsg;
    if (!isChannel) {
      getmsg = await client.sendMessage(event.chatId, {
        message: "正在获取视频信息，请稍等...",
      });
    }

    const result = await apiFunc(url);
    if (!result || (platform === "douyin" && !result.video?.video_url)) {
      const errorMsg = "无法获取视频信息，请检查链接是否正确。";
      if (!isChannel) {
        await client.editMessage(getmsg.chatId, {
          message: getmsg.id,
          text: errorMsg,
        });
      } else {
        await client.sendMessage(event.chatId, { message: errorMsg });
      }
      return;
    }

    const me = await client.getMe();
    const title = result.title.replace(/(?<!\s)#/g, " #");
    let caption;

    switch (platform) {
      case "douyin":
        caption = `${title}\n\nBy <a href="https://www.douyin.com/user/${result.author.sec_uid}">@${result.author.name}</a>`;
        if (result.cooperation_info && result.cooperation_info.length > 0) {
          for (const creator of result.cooperation_info) {
            caption += ` <a href="https://www.douyin.com/user/${creator.sec_uid}">@${creator.nickname}(${creator.role})</a>`;
          }
        }
        break;
      case "kuaishou":
        caption = `${title}\n\nBy <a href="https://www.kuaishou.com/profile/${result.author.uid}">@${result.author.name}</a>`;
        break;
      case "ppx":
        caption = `${title}\n\nBy <a href="${url}">@${result.author.name}</a>`;
        break;
    }
    caption += `\nvia @${me.username.toLowerCase()} - <a href="https://github.com/xiaoqvan/XQ-plugins">XQ-plugins</a>`;

    try {
      await sendMedia(client, event.chatId, result, caption, isChannel);
    } catch (sendError) {
      if (!isChannel) {
        const videoUrl = result.video?.video_url || result.video_url;
        await client.sendMessage(event.chatId, {
          message: `视频文件过大，无法直接发送。\n您可以通过以下链接下载：${videoUrl}`,
          parseMode: "html",
        });
      } else {
        throw sendError;
      }
    }

    if (!isChannel && getmsg) {
      await client.deleteMessages(getmsg.chatId, [getmsg.id], { revoke: true });
    }
  } catch (error) {
    await client.sendMessage(event.chatId, {
      message: `${error.message}`,
    });
  }
}

export async function douyin(client, event) {
  const msg = event.message;
  if (msg.message.startsWith("/douyin") || msg.message.startsWith("/dy")) {
    await handleVideo(client, event, "douyin", DouYin, "抖音视频");
  }
}

export async function kuaishou(client, event) {
  const msg = event.message;
  if (msg.message.startsWith("/kuaishou") || msg.message.startsWith("/ks")) {
    await handleVideo(client, event, "kuaishou", Kuaishou, "快手/快手图集");
  }
}

export async function ppx(client, event) {
  const msg = event.message;
  if (msg.message.startsWith("/ppx")) {
    await handleVideo(client, event, "ppx", pipix, "皮皮虾/皮皮虾图集");
  }
}
