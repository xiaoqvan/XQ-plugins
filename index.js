import music from "./163Music/163music.js";
import { douyin, kuaishou, ppx } from "./video/video.js";
import log from "#logger";
import { eventupdate } from "../../core/api/event.js";

export default async function (client) {
  eventupdate.on("CommandMessage", async (event) => {
    try {
      const message = event.message;
      const cmd = message.message.split(" ")[0];
      const commands = {
        "/music": music,
        "/dy": douyin,
        "/douyin": douyin,
        "/ks": kuaishou,
        "/kuaishou": kuaishou,
        "/ppx": ppx,
      };

      if (commands[cmd]) {
        await commands[cmd](client, event);
      }
    } catch (error) {
      log.error(`[XQ-plugins]插件处理消息时出错: ${error}`);
    }
  });
}
