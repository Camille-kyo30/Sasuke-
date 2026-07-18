const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const configPath = path.join(__dirname, "..", "..", "config.json");

function loadConfig() {
    try {
        const configData = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(configData);
    } catch (e) { return { admin: ["8984714130"] }; }
}

const nix = {
  name: "notification",
  version: "2.2.0",
  aliases: ["notify", "noti"],
  description: "Broadcast global Uchiha connecté à la base SQLite",
  author: "Camille 🤍",
  editor: "Camille Uchiha 🍓",
  prefix: false,
  category: "owner",
  type: "admin",
  cooldown: 5,
  guide: "{pn} <message>"
};

if (!global.telegramNotificationMemory) global.telegramNotificationMemory = new Map();

const DELAY_PER_GROUP = 300;

async function onStart({ bot, args, message, msg, chatId, userId }) {
  const currentMsg = message || msg;
  const senderID = String(userId || currentMsg?.from?.id || "").trim();
  const config = loadConfig();
  
  if (!config.admin.includes(senderID) && senderID !== "8984714130") {
    return bot.sendMessage(chatId, "⚠️ Action réservée aux administrateurs.");
  }

  const textMessage = args.join(" ").trim();
  if (!textMessage) return bot.sendMessage(chatId, "❌ Tu dois entrer un message pour tes sujets, Camille.");

  let rawThreads = [];

  try {
    // 1. Test via les contrôleurs standards de GoatBot
    if (global.controllers?.threads?.getAll && typeof global.controllers.threads.getAll === "function") {
      rawThreads = await global.controllers.threads.getAll();
    }
    // 2. Test direct via le modèle Sequelize SQLite si disponible
    else if (global.db?.models?.Threads?.findAll) {
      const dbThreads = await global.db.models.Threads.findAll({ raw: true });
      rawThreads = dbThreads || [];
    }
    // 3. Test de repli sur threadsData classique
    else if (global.threadsData?.getAll) {
      rawThreads = await global.threadsData.getAll();
    }
    // 4. Test cache global
    else if (global.data?.allThreadData) {
      rawThreads = global.data.allThreadData;
    }
  } catch (err) {
    console.error("[noti] Erreur lecture BDD :", err.message);
  }

  // Extraction et filtrage propre des IDs de groupes
  let allThreadID = [];
  if (Array.isArray(rawThreads) && rawThreads.length > 0) {
    allThreadID = rawThreads.map(t => {
      const id = String(t.threadID || t.id || t.tid || "");
      const name = t.threadName || t.name || "Groupe Inconnu";
      return { threadID: id, name: name };
    }).filter(t => t.threadID !== "" && (t.threadID.startsWith("-") || t.threadID.length > 8));
  }

  // Si la BDD ne renvoie aucun groupe, on force l'envoi dans le chat actuel pour éviter le vide absolu
  const currentChatOnly = allThreadID.length === 0;
  if (currentChatOnly) {
    allThreadID = [{ threadID: String(chatId), name: currentMsg?.chat?.title || "Ce Chat" }];
  }

  await bot.sendMessage(chatId, `🌀 Activation du Sharingan sur ${allThreadID.length} cibles...`);

  let photoToSend = currentMsg?.photo?.length ? currentMsg.photo[currentMsg.photo.length - 1].file_id : null;
  let videoToSend = currentMsg?.video?.file_id || currentMsg?.animation?.file_id;

  const replyToMessage = currentMsg?.reply_to_message;
  if (!photoToSend && !videoToSend && replyToMessage) {
    if (replyToMessage?.photo?.length) photoToSend = replyToMessage.photo[replyToMessage.photo.length - 1].file_id;
    else if (replyToMessage?.video?.file_id) videoToSend = replyToMessage.video.file_id;
    else if (replyToMessage?.animation?.file_id) videoToSend = replyToMessage.animation.file_id;
  }

  let sendSuccess = 0;
  let sendError = 0;

  for (const thread of allThreadID) {
    const tid = thread.threadID;
    // Si c'est le canal actuel et qu'on broadcaste en masse, on adapte le nom
    const threadName = currentChatOnly ? "Ce Chat" : (thread.name || "Groupe Inconnu");
    const time = moment.tz("Africa/Abidjan").format("HH:mm");

    const styledMessage = 
`╔═══════ 🍎 ═══════╗
   ⚡ <b>NOTIFICATION</b> ⚡
╚═══════ 🍎 ═══════╝
╭───── • 🍎 • ─────╮
   MESSAGE DE L'ADMIN
╰───── • 🍎 • ─────╯

👥 <b>Groupe :</b> ${threadName}
⏰ <b>Heure :</b> ${time}

📝 <b>Message :</b> 『 ${textMessage} 』

●▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
🚀 <b>Expéditeur :</b> Camille 🤍
🌀 <b>Status :</b> Jutsu Prioritaire
●▬▬▬▬▬▬▬▬▬▬▬▬▬▬●`;

    try {
      let sentMsg = null;
      if (photoToSend) {
        sentMsg = await bot.sendPhoto(tid, photoToSend, { caption: styledMessage, parse_mode: "HTML" });
      } else if (videoToSend) {
        sentMsg = await bot.sendVideo(tid, videoToSend, { caption: styledMessage, parse_mode: "HTML" });
      } else {
        sentMsg = await bot.sendMessage(tid, styledMessage, { parse_mode: "HTML" });
      }

      if (sentMsg) {
        sendSuccess++;
        global.telegramNotificationMemory.set(String(sentMsg.message_id) + "_" + String(tid), { groupName: threadName, threadID: tid });
      }
      await new Promise(resolve => setTimeout(resolve, DELAY_PER_GROUP));
    } catch (e) {
      sendError++;
    }
  }

  return bot.sendMessage(chatId, `✅ Transmis avec succès à ${sendSuccess} groupes.${sendError > 0 ? `\n❌ Échec sur ${sendError} cibles.` : ""}`, { parse_mode: "HTML" });
}

async function onChat({ bot, message, msg }) {
  const currentMsg = message || msg;
  const replyToMessage = currentMsg?.reply_to_message;
  if (!replyToMessage) return;

  const currentChatId = String(currentMsg.chat.id);
  const mapKey = String(replyToMessage.message_id) + "_" + currentChatId;
  const context = global.telegramNotificationMemory.get(mapKey);
  if (!context) return;

  const config = loadConfig();
  const adminID = config.admin && config.admin.length > 0 ? config.admin[0] : "8984714130";

  const adminMessage = 
    `📥 <b>[RÉPONSE AU JUTSU]</b>\n` +
    `👤 <b>Expéditeur :</b> ${currentMsg.from?.first_name || "Utilisateur"} (ID: <code>${currentMsg.from?.id || "Inconnu"}</code>)\n` +
    `👥 <b>Groupe :</b> ${context.groupName}\n\n` +
    `💬 <b>Message :</b>\n${currentMsg.text || "[Média]"}`;

  try {
    await bot.sendMessage(adminID, adminMessage, { parse_mode: "HTML" });
  } catch (e) {}
}

module.exports = { nix, onStart, onChat };
