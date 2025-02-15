import music from "./163Music/163music.js";
import { douyin, kuaishou } from "./video/video.js";
import log from "#logger";
import { eventupdate } from "../../core/api/event.js";

export default async function (client) {
  eventupdate.on("CommandMessage", async (event) => {
    try {
      // 把获取的消息赋值给message
      const message = event.message;
      const cmd = message.message.split(" ")[0];
      const commands = {
        "/music": music,
        "/douyin": douyin,
        "/kuaishou": kuaishou,
      };

      if (commands[cmd]) {
        await commands[cmd](client, event);
      }
    } catch (error) {
      log.error(`[XQ-plugins]插件处理消息时出错: ${error}`);
    }
  });
}
