const moment = require("moment-timezone");

const nix = {
  name: "notification",
  version: "1.9",
  aliases: ["notify", "noti"],
  description: "Envoyer une annonce Uchiha stylée à tous les groupes",
  author: "Camille 🤍",
  editor: "Camille Uchiha 🍓",
  prefix: false,
  category: "owner",
  type: "admin",
  cooldown: 5,
  guide: "{pn} <message>"
};

// Mémoire des notifications pour gérer le routage des réponses en privé
if (!global.telegramNotificationMemory) {
  global.telegramNotificationMemory = new Map();
}

// Identifiant Telegram unique de Camille Uchiha
const ADMIN_IDS = ["8984714130"];
const DELAY_PER_GROUP = 250; // Délai anti-flood par défaut

async function onStart({ bot, args, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  const senderID = currentMsg?.from?.id ? String(currentMsg.from.id) : "";

  const sendReply = async (text) => {
    try {
      if (currentMsg && typeof currentMsg.reply === "function") {
        return await currentMsg.reply(text, { parse_mode: "HTML" });
      }
      if (bot && typeof bot.sendMessage === "function") {
        return await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
    } catch (e) { console.error("[noti] Erreur d'envoi :", e.message); }
  };

  // 1. Vérification Admin du Bot
  if (!senderID || !ADMIN_IDS.includes(senderID)) {
    return sendReply("⚠️ Action réservée à l'administrateur système.");
  }

  // 2. Extraction du message
  const textMessage = args.join(" ").trim();
  if (!textMessage) {
    return sendReply("❌ Tu dois entrer un message pour tes sujets, Camille.");
  }

  // 3. Récupération des groupes cibles via SQLite / threadsData
  let allThreadID = [];
  if (global.threadsData && typeof global.threadsData.getAll === "function") {
    const list = await global.threadsData.getAll();
    allThreadID = list.filter(t => t.isGroup || String(t.threadID).startsWith("-"));
  } else {
    allThreadID = [{ threadID: chatId, name: currentMsg.chat.title || "Ce Chat" }];
  }

  if (!allThreadID.length) return sendReply("❌ [SYSTEM] INFO: Aucun groupe cible disponible.");

  await sendReply(`🌀 Activation du Sharingan sur ${allThreadID.length} groupes...`);

  // 4. Gestion des pièces jointes (Photo / Vidéo) sur Telegram
  // On regarde si le message actuel ou le message répondu contient un média
  const replyToMessage = currentMsg?.reply_to_message;
  let photoToSend = null;
  let videoToSend = null;

  if (currentMsg.photo && currentMsg.photo.length > 0) {
    photoToSend = currentMsg.photo[currentMsg.photo.length - 1].file_id;
  } else if (currentMsg.video) {
    videoToSend = currentMsg.video.file_id;
  } else if (replyToMessage) {
    if (replyToMessage.photo && replyToMessage.photo.length > 0) {
      photoToSend = replyToMessage.photo[replyToMessage.photo.length - 1].file_id;
    } else if (replyToMessage.video) {
      videoToSend = replyToMessage.video.file_id;
    }
  }

  let sendSuccess = 0;
  const sendError = [];

  // 5. Boucle de diffusion
  for (const thread of allThreadID) {
    const tid = thread.threadID;
    let threadName = thread.name || "Groupe Inconnu";
    const time = moment.tz("Africa/Abidjan").format("HH:mm");

    // Récupération en temps réel des infos fraîches du groupe Telegram si possible
    try {
      const chatDetails = await bot.getChat(tid);
      threadName = chatDetails.title || threadName;
    } catch {}

    // Design Sasuke Uchiha adapté au format HTML Telegram
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

      // Envoi selon la présence d'un média ou non
      if (photoToSend) {
        sentMsg = await bot.sendPhoto(tid, photoToSend, { caption: styledMessage, parse_mode: "HTML" });
      } else if (videoToSend) {
        sentMsg = await bot.sendVideo(tid, videoToSend, { caption: styledMessage, parse_mode: "HTML" });
      } else {
        sentMsg = await bot.sendMessage(tid, styledMessage, { parse_mode: "HTML" });
      }

      if (sentMsg) {
        sendSuccess++;
        // Liaison de l'ID du message pour attraper les réponses plus tard (onChat)
        global.telegramNotificationMemory.set(String(sentMsg.message_id) + "_" + String(tid), {
          groupName: threadName,
          threadID: tid
        });
      }

      // Délai anti-flood régulé
      await new Promise(resolve => setTimeout(resolve, DELAY_PER_GROUP));
    } catch (e) {
      sendError.push(threadName || tid);
    }
  }

  // 6. Rapport final à Camille
  let msgBilan = `✅ Transmis avec succès à ${sendSuccess} groupes.`;
  if (sendError.length > 0) {
    msgBilan += `\n❌ Échec sur ${sendError.length} groupes.`;
  }
  return sendReply(msgBilan);
}

// Gestionnaire de réponses automatique (Intercepteur onChat)
async function onChat({ bot, message, msg }) {
  const currentMsg = message || msg;
  const replyToMessage = currentMsg?.reply_to_message;
  
  if (!replyToMessage) return;

  const currentChatId = String(currentMsg.chat.id);
  const replyTargetId = String(replyToMessage.message_id);

  const mapKey = replyTargetId + "_" + currentChatId;
  const context = global.telegramNotificationMemory.get(mapKey);

  if (!context) return;

  const userName = (currentMsg.from.first_name || "") + (currentMsg.from.last_name ? " " + currentMsg.from.last_name : "") || "Utilisateur";
  const userID = currentMsg.from.id;

  const adminMessage = 
    `📥 <b>[RÉPONSE AU JUTSU]</b>\n` +
    `👤 <b>Expéditeur :</b> ${userName} (ID: <code>${userID}</code>)\n` +
    `👥 <b>Groupe :</b> ${context.groupName} (ID: <code>${context.threadID}</code>)\n\n` +
    `💬 <b>Message :</b>\n${currentMsg.text || "[Média/Autre]"}\n\n` +
    `───\n` +
    `⚠️ <i>Utilise /callad <code>${context.threadID}</code> pour interagir directement.</i>`;

  try {
    if (ADMIN_IDS.length > 0) {
      await bot.sendMessage(ADMIN_IDS[0], adminMessage, { parse_mode: "HTML" });
    }
  } catch (e) {
    console.error("[noti-reply] Échec routage admin :", e.message);
  }
}

module.exports = { nix, onStart, onChat };
