import DouYin from "./api/douyin.js";
import Kuaishou from "./api/kuaishou.js";

export async function douyin(client, event) {
  const msg = event.message;
  const message = msg.message;

  if (message.startsWith("/douyin")) {
    // 使用正则表达式提取链接
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
      await client.sendMessage(event.chatId, {
        message:
          "请提供支持的视频平台分享链接\n目前支持的平台:\n- 抖音/抖音图集",
      });
      return;
    }

    try {
      const getmsg = await client.sendMessage(event.chatId, {
        message: "正在获取视频信息，请稍等...",
      });
      const result = await DouYin(url);

      if (!result || !result.video_url) {
        await client.editMessage(getmsg.chatId, {
          message: getmsg.id,
          text: "无法获取视频信息，请检查链接是否正确。",
        });
        return;
      }

      const title = result.title.replace(/(?<!\s)#/g, " #");
      const caption = `${title} \n\nBy <a href="https://www.douyin.com/user/${result.author.uid}">${result.author.name}</a>`;

      await client.sendMessage(event.chatId, {
        file: result.video_url,
        message: caption,
        parseMode: "html",
      });
      await client.deleteMessages(getmsg.chatId, [getmsg.id], {
        revoke: true,
      });
    } catch (error) {
      await client.sendMessage(event.chatId, {
        message: `消息发送失败: ${error.message}`,
      });
    }
  }
}

export async function kuaishou(client, event) {
  const msg = event.message;
  const message = msg.message;

  if (message.startsWith("/kuaishou")) {
    // 使用正则表达式提取链接
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
      await client.sendMessage(event.chatId, {
        message:
          "请提供支持的视频平台分享链接\n目前支持的平台:\n- 快手/快手图集",
      });
      return;
    }

    try {
      const getmsg = await client.sendMessage(event.chatId, {
        message: "正在获取视频信息，请稍等...",
      });
      const result = await Kuaishou(url);

      if (!result || !result.url) {
        await client.editMessage(getmsg.chatId, {
          message: getmsg.id,
          text: "无法获取视频信息，请检查链接是否正确。",
        });
        return;
      }

      const title = result.title.replace(/(?<!\s)#/g, " #");
      const caption = `${title} \n\nBy <a href="https://www.kuaishou.com/profile/${result.author.uid}">${result.author.name}</a>`;

      await client.sendMessage(event.chatId, {
        file: result.url,
        message: caption,
        parseMode: "html",
      });
      await client.deleteMessages(getmsg.chatId, [getmsg.id], {
        revoke: true,
      });
    } catch (error) {
      await client.sendMessage(event.chatId, {
        message: `失败: ${error.message}`,
      });
    }
  }
}
