import { get163music, searchMusic } from "./api/music.js";
import fs from "fs";
import { join, extname } from "path";
import { genImage, deleteImage } from "#puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { Api } from "telegram";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadDir = "../../../caching/downloads";
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
const qualityMap = {
  standard: "标准音质",
  exhigh: "极高音质",
  lossless: "无损音质",
  hires: "Hires音质",
  sky: "沉浸环绕声",
  jyeffect: "高清环绕声",
  jymaster: "超清母带",
};
const searchhtml = fs.readFileSync(
  path.join(__dirname, "./html/163search.html"),
  "utf8"
);

export default async function music(client, event) {
  const message = event.message;
  const command = message.message.split(" ");

  if (command[0].startsWith("/music")) {
    const music = command[1];
    const level = command[2] || "standard";

    if (!music) {
      if (message.peerId?.className === "PeerUser") {
        client.sendMessage(message.chatId, {
          message:
            "请提供歌曲ID或名称。\n下载歌曲 /music <歌曲ID> \n搜索 /music <歌曲名称>",
        });
      } else {
        await client.sendMessage(message.chatId, {
          message: "请提供歌曲ID或名称。",
          replyTo: message.id,
        });
      }
      return;
    }

    if (/^\d+$/.test(music)) {
      let songInfo;
      let getmsg;
      try {
        if (message.peerId?.className === "PeerUser") {
          getmsg = await client.sendMessage(message.chatId, {
            message: "正在获取歌曲信息，请稍后。",
          });
        } else {
          getmsg = await client.sendMessage(message.chatId, {
            message: "正在获取歌曲信息，请稍后。",
            replyTo: message.id,
          });
        }
        songInfo = await get163music(music, level);
        // console.log(songInfo);
      } catch (error) {
        client.editMessage(message.chatId, {
          message: getmsg.id,
          text: `获取歌曲信息失败:${error.message}`,
        });
        throw error;
      }
      try {
        ensureDirectoryExists(downloadDir);

        try {
          const response = await fetch(songInfo.url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          let fileExtension = extname(songInfo.url).split("?")[0];
          if (!fileExtension && songInfo.type) {
            fileExtension = songInfo.type.startsWith(".")
              ? songInfo.type
              : "." + songInfo.type;
          }
          const sanitizedFileName = `${songInfo.name.replace(
            /[/\\:*?"<>|]/g,
            ""
          )} - ${songInfo.artists.replace(
            /[/\\:*?"<>|]/g,
            ""
          )}${fileExtension}`;
          const filePath = join(downloadDir, sanitizedFileName);

          fs.writeFileSync(filePath, buffer);

          try {
            const coverResponse = await fetch(songInfo.picUrl);
            const coverArrayBuffer = await coverResponse.arrayBuffer();
            const coverBuffer = Buffer.from(coverArrayBuffer);
            const coverPath = join(
              downloadDir,
              `${songInfo.name.replace(/[/\\:*?"<>|]/g, "")}-cover.jpg`
            );
            fs.writeFileSync(coverPath, coverBuffer);

            await client.editMessage(getmsg.chatId, {
              message: getmsg.id,
              text: "歌曲已下载，正在上传...",
            });

            try {
              const me = await client.getMe();
              const qualityText = qualityMap[songInfo.level] || songInfo.level;
              const test = `<a href="https://music.163.com/#/song?id=${
                songInfo.id
              }">${songInfo.name} - ${songInfo.artists}</a>
              \n音质: ${qualityText}\n大小: ${(
                buffer.length /
                1024 /
                1024
              ).toFixed(2)} MB\nvia @${me.username.toLowerCase()}`;
              const commonMessageOptions = {
                file: filePath,
                thumb: coverPath,
                message: test,
                parseMode: "html",
                attributes: [
                  new Api.DocumentAttributeAudio({
                    title: songInfo.name,
                    performer: songInfo.artists,
                    voice: false,
                    duration: songInfo.time / 1000,
                  }),
                ],
              };
              if (message.peerId?.className === "PeerUser") {
                await client.sendMessage(getmsg.chatId, commonMessageOptions);
              } else {
                await client.sendMessage(getmsg.chatId, {
                  ...commonMessageOptions,
                  replyTo: message.id,
                });
              }

              await client.deleteMessages(getmsg.chatId, [getmsg.id], {
                revoke: true,
              });

              fs.unlinkSync(filePath);
              fs.unlinkSync(coverPath);
            } catch (uploadError) {
              throw new Error(`无法上传歌曲文件，请稍后再试。${uploadError}`);
            }
          } catch (coverDownloadError) {
            throw new Error(`无法下载封面图片: ${coverDownloadError}`);
          }
        } catch (songDownloadError) {
          await client.editMessage(message.chatId, {
            message: getmsg.id,
            text: `无法下载歌曲文件${songDownloadError.message}`,
          });
          throw new Error(`无法下载歌曲文件。${songDownloadError}`);
        }
      } catch (error) {
        throw new Error(`获取歌曲信息失败。${error}`);
      }
    } else {
      let searchmsg;
      if (message.peerId?.className === "PeerUser") {
        searchmsg = await client.sendMessage(message.chatId, {
          message: "正在搜索歌曲，请稍后。",
        });
      } else {
        searchmsg = await client.sendMessage(message.chatId, {
          message: "正在搜索歌曲，请稍后。",
          replyTo: message.id,
        });
      }
      let search;
      let keyword = message.message.replace(/^\/music/, "");
      try {
        search = await searchMusic(keyword);
      } catch (error) {
        client.editMessage(message.chatId, {
          message: searchmsg.id,
          text: `搜索歌曲失败:${error.message}`,
        });
        throw error;
      }
      let musicList = "";
      let count = 0;
      search.forEach((search) => {
        if (count < 6) {
          let vipTag = "";
          if (search.metaData && search.metaData.includes("VIP")) {
            vipTag = `
              <div class="vip-tag">
                <div class="cmd-tag-content">VIP</div>
              </div>`;
          }

          musicList += `
            <div class="music-item">
              <div class="music-item-cover">
                <img src="${search.cover}" alt="cover">
              </div>
              <div class="music-item-info">
                <div class="music-item-name">
                  <p>${search.name}</p> 
                </div>
                <div class="music-item-artist">
                  ${vipTag}
                  <p>${search.artists}</p>
                </div>
                <div class="music-item-id">
                  <p>ID: <span class="music-item-id-text">${search.id}</span></p>
                </div>
                <div class="music-item-action">
                  <p>${search.alia}</p>
                </div>
              </div>
            </div>`;
          count++;
        }
      });
      const html = searchhtml
        .replace("${keyword}", keyword)
        .replace("${musicList}", musicList)
        .replace("${version}", process.env.npm_package_version);
      const viewport = { width: 400, height: 180, deviceScaleFactor: 3 };
      let searcimagepath;
      try {
        searcimagepath = await genImage(html, viewport);
      } catch (error) {
        client.editMessage(message.chatId, {
          message: searchmsg.id,
          text: "生成图片失败。",
        });
        throw error;
      }
      try {
        if (message.peerId?.className === "PeerUser") {
          await client.sendMessage(message.chatId, {
            file: searcimagepath,
          });
        } else {
          await client.sendMessage(message.chatId, {
            file: searcimagepath,
            replyTo: message.id,
          });
        }
        await deleteImage(searcimagepath);
        await client.deleteMessages(message.chatId, [searchmsg.id], {
          revoke: true,
        });
      } catch (error) {
        client.editMessage(message.chatId, {
          message: searchmsg.id,
          text: "发送图片失败。",
        });
        throw error;
      }
    }
  }
}
