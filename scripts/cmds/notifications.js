const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const configPath = path.join(__dirname, "..", "..", "config.json");

function loadConfig() {
    try {
        const configData = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(configData);
        if (!config.admin) config.admin = [];
        return config;
    } catch (error) {
        return { admin: ["8984714130"] };
    }
}

const nix = {
  name: "notification",
  version: "2.0.0",
  aliases: ["notify", "noti"],
  description: "Broadcast Uchiha synchronisé avec config.json",
  author: "Camille 🤍",
  editor: "Camille Uchiha 🍓",
  prefix: false,
  category: "owner",
  type: "admin",
  cooldown: 5,
  guide: "{pn} <message>"
};

if (!global.telegramNotificationMemory) {
  global.telegramNotificationMemory = new Map();
}

const DELAY_PER_GROUP = 250;

async function onStart({ bot, args, message, msg, chatId, userId }) {
  const currentMsg = message || msg;
  
  // Utilisation de l'userId destructuré ou repli sur l'objet message
  const senderIDRaw = userId || currentMsg?.from?.id;
  const senderID = senderIDRaw ? String(senderIDRaw).trim() : "";

  const config = loadConfig();
  const authorizedAdmins = config.admin ? config.admin.map(String) : [];

  const sendReply = async (text) => {
    try {
      return await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    } catch (e) { console.error("[noti] Erreur d'envoi :", e.message); }
  };

  // Vérification stricte
  if (!authorizedAdmins.includes(senderID) && senderID !== "8984714130") {
    return sendReply(`⚠️ Action réservée aux administrateurs.\n🕵️‍♂️ <b>ID détecté par le bot :</b> <code>${senderID || "Introuvable"}</code>`);
  }

  const textMessage = args.join(" ").trim();
  if (!textMessage) return sendReply("❌ Tu dois entrer un message pour tes sujets, Camille.");

  let allThreadID = [];
  if (global.threadsData && typeof global.threadsData.getAll === "function") {
    const list = await global.threadsData.getAll();
    allThreadID = list.filter(t => t.isGroup || String(t.threadID).startsWith("-"));
  } else {
    allThreadID = [{ threadID: chatId, name: currentMsg?.chat?.title || "Ce Chat" }];
  }

  await sendReply(`🌀 Activation du Sharingan sur ${allThreadID.length} groupes...`);

  // Gestion des Médias
  let photoToSend = null, videoToSend = null;
  const replyToMessage = currentMsg?.reply_to_message;

  if (currentMsg?.photo?.length > 0) photoToSend = currentMsg.photo[currentMsg.photo.length - 1].file_id;
  else if (currentMsg?.video) videoToSend = currentMsg.video.file_id;
  else if (replyToMessage) {
    if (replyToMessage.photo?.length > 0) photoToSend = replyToMessage.photo[replyToMessage.photo.length - 1].file_id;
    else if (replyToMessage.video) videoToSend = replyToMessage.video.file_id;
  }

  let sendSuccess = 0;
  for (const thread of allThreadID) {
    const tid = thread.threadID;
    let threadName = thread.name || "Groupe Inconnu";
    const time = moment.tz("Africa/Abidjan").format("HH:mm");

    try {
      const chatDetails = await bot.getChat(tid);
      threadName = chatDetails.title || threadName;
    } catch {}

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
      if (photoToSend) sentMsg = await bot.sendPhoto(tid, photoToSend, { caption: styledMessage, parse_mode: "HTML" });
      else if (videoToSend) sentMsg = await bot.sendVideo(tid, videoToSend, { caption: styledMessage, parse_mode: "HTML" });
      else sentMsg = await bot.sendMessage(tid, styledMessage, { parse_mode: "HTML" });

      if (sentMsg) {
        sendSuccess++;
        global.telegramNotificationMemory.set(String(sentMsg.message_id) + "_" + String(tid), { groupName: threadName, threadID: tid });
      }
      await new Promise(resolve => setTimeout(resolve, DELAY_PER_GROUP));
    } catch (e) {}
  }

  return sendReply(`✅ Transmis avec succès à ${sendSuccess} groupes.`);
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
