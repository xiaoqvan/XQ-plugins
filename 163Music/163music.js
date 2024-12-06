import { get163music, searchMusic } from "./api/music.js";
import fetch from "node-fetch";
import fs from "fs";
import { join, extname } from "path";
import { genImage, deleteImage } from "#puppeteer";
import log from "#logger";
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

const searchhtml = fs.readFileSync(
  path.join(__dirname, "./html/163search.html"),
  "utf8"
);

export default async function music(client, event) {
  const message = event.message;
  const searchkey = message.message.split(" ")[1];
  const command = message.message.split(" ");

  if (command[0].startsWith("/music")) {
    const music = command[1];
    const level = command[2] || "standard";

    if (!music) {
      if (message.peerId?.className === "PeerUser") {
        client.sendMessage(message.chatId, {
          message: "请提供歌曲ID或名称。",
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
      } catch (error) {
        client.editMessage(message.chatId, {
          message: getmsg.id,
          text: "获取歌曲信息失败。",
        });
      }
      try {
        ensureDirectoryExists(downloadDir);

        try {
          const response = await fetch(songInfo.url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileExtension = extname(songInfo.url).split("?")[0];
          const sanitizedFileName = `${songInfo.name.replace(
            /[\/\\:*?"<>|]/g,
            ""
          )} - ${songInfo.artists.replace(
            /[\/\\:*?"<>|]/g,
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
              `${songInfo.name.replace(/[\/\\:*?"<>|]/g, "")}-cover.jpg`
            );
            fs.writeFileSync(coverPath, coverBuffer);

            await client.editMessage(getmsg.chatId, {
              message: getmsg.id,
              text: "歌曲已下载，正在上传...",
            });

            try {
              if (message.peerId?.className === "PeerUser") {
                await client.sendMessage(getmsg.chatId, {
                  file: filePath,
                  thumb: coverPath,
                  attributes: [
                    new Api.DocumentAttributeAudio({
                      title: songInfo.name,
                      performer: songInfo.artists,
                      voice: false,
                    }),
                  ],
                });
              } else {
                await client.sendMessage(getmsg.chatId, {
                  file: filePath,
                  thumb: coverPath,
                  replyTo: message.id,
                  attributes: [
                    new Api.DocumentAttributeAudio({
                      title: songInfo.name,
                      performer: songInfo.artists,
                      voice: false,
                    }),
                  ],
                });
              }

              await client.deleteMessages(getmsg.chatId, [getmsg.id], {
                revoke: true,
              });

              fs.unlinkSync(filePath);
              fs.unlinkSync(coverPath);
            } catch (uploadError) {
              log.error(`无法上传歌曲文件: ${uploadError}`);
              await client.editMessage(message.chatId, {
                message: getmsg.id,
                text: "无法上传歌曲文件，请稍后再试。",
              });
            }
          } catch (coverDownloadError) {
            log.error(`无法下载封面图片: ${coverDownloadError}`);
            await client.editMessage(message.chatId, {
              message: getmsg.id,
              text: "无法下载封面图片，请稍后再试。",
            });
          }
        } catch (songDownloadError) {
          log.error(`无法下载歌曲文件: ${songDownloadError}`);
          await client.editMessage(message.chatId, {
            message: getmsg.id,
            text: "无法下载歌曲文件，请检查你的id是否正确。",
          });
        }
      } catch (error) {
        log.error(`获取歌曲信息失败: ${error}`);
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
          text: "搜索歌曲失败。",
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
      }
    }
  }
}
