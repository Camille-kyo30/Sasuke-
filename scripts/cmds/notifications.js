const axios = require("axios");
const fs = require("fs-extra");

const nix = {
  name: "notification",
  version: "14.0.0",
  aliases: ["notify", "noti"],
  description: "Broadcast Pro Textuel avec suivi des réponses",
  author: "Camille Uchiha",
  editor: "Camille Uchiha 🍓",
  prefix: false,
  category: "owner",
  type: "admin",
  cooldown: 5,
  guide: "{pn} [votre message]"
};

// Mémoire des notifications pour gérer le routage des réponses
if (!global.telegramNotificationMemory) {
  global.telegramNotificationMemory = new Map();
}

// Identifiant Telegram de Camille Uchiha
const ADMIN_IDS = ["8984714130"];

async function onStart({ bot, args, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  
  // Conversion explicite en String pour la comparaison
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

  // Vérification de l'administrateur
  if (!senderID || !ADMIN_IDS.includes(senderID)) {
    return sendReply("⚠️ Action réservée à l'administrateur système.");
  }

  const broadcastMessage = args.join(" ").trim();
  if (!broadcastMessage) return sendReply("⚠️ [SYSTEM] ERREUR: Contenu du message vide.");

  // 1. Récupération du nom de l'admin
  const adminName = (currentMsg.from.first_name || "") + (currentMsg.from.last_name ? " " + currentMsg.from.last_name : "") || "Administrateur";

  // 2. Définition des groupes cibles depuis SQLite / threadsData
  let targetGroupIds = []; 
  if (global.threadsData && typeof global.threadsData.getAll === "function") {
    const list = await global.threadsData.getAll();
    targetGroupIds = list.map(t => String(t.threadID));
  } else {
    targetGroupIds = [String(chatId)]; 
  }

  if (!targetGroupIds.length) return sendReply("❌ [SYSTEM] INFO: Aucun groupe cible disponible.");

  await sendReply(`⏳ [SYSTEM] Diffusion du message en cours vers ${targetGroupIds.length} canaux/groupes...`);

  let sendSuccess = 0;
  const sendError = [];

  for (const targetId of targetGroupIds) {
    let groupName = "Groupe sans nom";

    try {
      const chatInfo = await bot.getChat(targetId);
      groupName = chatInfo.title || chatInfo.first_name || groupName;
    } catch {}

    const now = new Date();
    const timeString = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // Design stylisé textuel pour remplacer la mise en page Canvas
    const templateText = 
      `🚨 <b>▎ SYSTEM BROADCAST</b>\n` +
      `📅 <i>Envoyé à : ${timeString}</i>\n` +
      `👤 <b>Expéditeur :</b> ${adminName} (Admin)\n` +
      `👥 <b>Destination :</b> ${groupName}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `${broadcastMessage}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💬 <i>Répondez directement à ce message pour communiquer avec l'administration.</i>`;

    try {
      const sentMsg = await bot.sendMessage(targetId, templateText, {
        parse_mode: "HTML"
      });

      if (sentMsg) {
        sendSuccess++;
        // Liaison ID Message + ID Groupe pour capter les réponses
        global.telegramNotificationMemory.set(String(sentMsg.message_id) + "_" + String(targetId), {
          groupName,
          threadID: targetId
        });
      }

      // Latence anti-flood standard
      await new Promise(resolve => setTimeout(resolve, 350));

    } catch (err) {
      sendError.push({ threadID: targetId, groupName, error: err.message });
    }
  }

  let bilan = `📊 <b>[BILAN DIFFUSION]</b>\n🟢 Réussis: <b>${sendSuccess}</b>\n🔴 Échecs: <b>${sendError.length}</b>`;
  if (sendError.length) {
    sendError.forEach(err => { bilan += `\n- ${err.groupName} (<code>${err.threadID}</code>): ${err.error}`; });
  }
  return sendReply(bilan);
}

// Intercepteur onChat pour acheminer instantanément les réponses vers ton compte privé
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
    `📥 <b>[RÉPONSE DÉTECTÉE]</b>\n` +
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
