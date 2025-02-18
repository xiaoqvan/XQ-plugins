import DouYin from "./api/douyin.js";
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
      file: result.video_url,
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
      message: `请提供支持的视频平台分享链接\n目前支持的平台:\n- ${platformName}`,
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
    if (!result || (platform === "douyin" && !result.video_url === " ")) {
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
        caption = `${title}\n\nBy <a href="https://www.douyin.com/user/${result.author.uid}">@${result.author.name}</a>`;
        break;
      case "kuaishou":
        caption = `${title}\n\nBy <a href="https://www.kuaishou.com/profile/${result.author.uid}">@${result.author.name}</a>`;
        break;
      case "ppx":
        caption = `${title}\n\nBy <a href="${url}">@${result.author.name}</a>`;
        break;
    }
    caption += `\nvia @${me.username.toLowerCase()} - <a href="https://github.com/xiaoqvan/XQ-plugins">XQ-plugins</a>`;

    await sendMedia(client, event.chatId, result, caption, isChannel);

    if (!isChannel && getmsg) {
      await client.deleteMessages(getmsg.chatId, [getmsg.id], { revoke: true });
    }
  } catch (error) {
    await client.sendMessage(event.chatId, {
      message: `消息发送失败: ${error.message}`,
    });
  }
}

export async function douyin(client, event) {
  const msg = event.message;
  if (msg.message.startsWith("/douyin") || msg.message.startsWith("/dy")) {
    await handleVideo(client, event, "douyin", DouYin, "抖音/抖音图集");
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
