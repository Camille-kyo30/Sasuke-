const nix = {
  name: "callad",
  version: "1.8.0",
  aliases: ["report", "bug"],
  description: "Envoyer un rapport, des commentaires ou un bug aux administrateurs du bot",
  author: "NTKhang",
  editor: "Camille Uchiha 🍓",
  prefix: true,
  category: "info",
  type: "anyone",
  cooldown: 5,
  guide: "{pn} [votre message]"
};

// Liste des IDs Telegram numériques des administrateurs du bot
const ADMIN_IDS = ["61591108301616", "61577875842514"];

// Initialisation du registre global des correspondances de messages s'il n'existe pas
if (!global.telegramCalladMap) {
  global.telegramCalladMap = new Map();
}

const lang = {
  missingMessage: `🍓━━━━━━━━🍓\n⚠️ 𝗘𝗥𝗥𝗘𝗨𝗥\nVeuillez saisir votre message à envoyer aux admins\n🍓━━━━━━━━🍓`,
  sendByGroup: `\n📍 𝗚𝗿𝗼𝘂𝗽𝗲: %1\n🆔 𝗜地方: %2`,
  sendByUser: `\n📍 𝗠𝗣: Message privé`,
  content: `\n\n📝 𝗖𝗢𝗡𝗧𝗘𝗡𝗨:\n─────────────────\n%1\n─────────────────\n💬 Répondez à ce message pour correspondre`,
  success: `🍓━━━━━━━━🍓\n✅ 𝗘𝗡𝗩𝗢𝗬𝗘́\n\nMessage envoyé avec succès aux admins actifs !\n🍓━━━━━━━━🍓`,
  failed: `🍓━━━━━━━━🍓\n❌ 𝗘́𝗖𝗛𝗘𝗖\nImpossible de joindre les administrateurs actuellement.\n🍓━━━━━━━━🍓`,
  reply: `🍓━━━━━━━━🍓\n⌖ 𝗥𝗘́𝗣𝗢𝗡𝗦𝗘 𝗔𝗗𝗠𝗜𝗡 👤\n─────────────────\n%1\n─────────────────\n💬 Répondez pour continuer\n🍓━━━━━━━━🍓`,
  feedback: `🍓━━━━━━━━🍓\n✎ 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 𝗨𝗦𝗘𝗥 %1\n- 𝗜𝗗: %2%3\n\n📝 𝗖𝗢𝗡𝗧𝗘𝗡𝗨:\n─────────────────\n%4\n─────────────────\n💬 Répondez pour répondre\n🍓━━━━━━━━🍓`
};

async function onStart({ bot, args, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  const messageId = currentMsg?.message_id;
  const fromObj = currentMsg?.from;

  const sendReply = async (text) => {
    try {
      if (currentMsg && typeof currentMsg.reply === "function") {
        return await currentMsg.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        return await bot.sendMessage(chatId, text);
      }
    } catch (e) {
      console.error("[callad] Erreur d'envoi Telegram:", e.message);
    }
  };

  if (!args || args.length === 0) {
    return sendReply(lang.missingMessage);
  }

  if (!ADMIN_IDS || ADMIN_IDS.length === 0) {
    return sendReply(`🍓━━━━━━━━🍓\n❌ <b>ERREUR</b>\nAucun admin configuré pour ce bot\n🍓━━━━━━━━🍓`);
  }

  const senderID = String(fromObj?.id);
  const senderName = (fromObj?.first_name || "") + (fromObj?.last_name ? " " + fromObj.last_name : "") || "Utilisateur Telegram";
  
  const isGroup = currentMsg.chat.type === "group" || currentMsg.chat.type === "supergroup";
  let groupDetails = "";

  if (isGroup) {
    groupDetails = lang.sendByGroup.replace("%1", currentMsg.chat.title || "Groupe Telegram").replace("%2", chatId);
  } else {
    groupDetails = lang.sendByUser;
  }

  const header = `🍓━━━━━━━━🍓\n📨 𝗔𝗣𝗣𝗘𝗟 𝗔𝗗𝗠𝗜𝗡 📨\n🍓━━━━━━━━🍓\n👤 <b>Nom:</b> ${senderName}\n🆔 <b>ID:</b> ${senderID}` + groupDetails;
  const fullContent = header + lang.content.replace("%1", args.join(" "));

  let successCount = 0;

  for (const adminId of ADMIN_IDS) {
    try {
      let sentAdminMsg;
      if (bot && typeof bot.sendMessage === "function") {
        sentAdminMsg = await bot.sendMessage(adminId, fullContent, { parse_mode: "HTML" });
      }

      if (sentAdminMsg) {
        successCount++;
        // On mémorise la liaison bidirectionnelle
        global.telegramCalladMap.set(String(sentAdminMsg.message_id) + "_" + String(adminId), {
          sourceChatId: chatId,
          sourceMessageId: messageId,
          sourceUserId: senderID,
          type: "toAdmin"
        });
      }
    } catch (err) {
      console.error(`[callad] Échec de l'envoi à l'admin ${adminId}:`, err.message);
    }
  }

  if (successCount > 0) {
    return sendReply(lang.success);
  } else {
    return sendReply(lang.failed);
  }
}

// Fonction d'écoute globale à intégrer dans ton dispatcher ou handler d'événements de réponses (Replies)
async function onChat({ bot, message, msg }) {
  const currentMsg = message || msg;
  const replyToMessage = currentMsg?.reply_to_message;
  
  if (!replyToMessage || !currentMsg.text) return;

  const currentChatId = String(currentMsg.chat.id);
  const currentMessageId = String(currentMsg.message_id);
  const replyTargetId = String(replyToMessage.message_id);
  const fromObj = currentMsg.from;
  const senderID = String(fromObj?.id);
  const senderName = (fromObj?.first_name || "") + (fromObj?.last_name ? " " + fromObj.last_name : "") || "Interlocuteur";

  const mapKey = replyTargetId + "_" + currentChatId;
  const context = global.telegramCalladMap.get(mapKey);

  if (!context) return;

  try {
    // CAS 1 : C'est un Administrateur qui répond à l'alerte reçue
    if (context.type === "toAdmin" && ADMIN_IDS.includes(currentChatId)) {
      const replyContent = lang.reply.replace("%1", senderName).replace("%2", currentMsg.text);
      
      let sentUserMsg = await bot.sendMessage(context.sourceChatId, replyContent, {
        reply_to_message_id: context.sourceMessageId,
        parse_mode: "HTML"
      });

      if (sentUserMsg) {
        await bot.sendMessage(currentChatId, `🍓━━━━━━━━🍓\n✅ Réponse transmise avec succès à l'utilisateur.\n🍓━━━━━━━━🍓`, { reply_to_message_id: currentMsg.message_id });
        
        // Permet à l'utilisateur de ré-enchaîner directement en répondant à la réponse de l'admin
        global.telegramCalladMap.set(String(sentUserMsg.message_id) + "_" + String(context.sourceChatId), {
          sourceChatId: currentChatId,
          sourceMessageId: currentMessageId,
          sourceUserId: senderID,
          type: "toUser"
        });
      }
    }
    
    // CAS 2 : C'est l'utilisateur qui répond à la réponse de l'admin
    else if (context.type === "toUser") {
      const isGroup = currentMsg.chat.type === "group" || currentMsg.chat.type === "supergroup";
      const groupDetails = isGroup ? lang.sendByGroup.replace("%1", currentMsg.chat.title || "Groupe").replace("%2", currentChatId) : lang.sendByUser;
      
      const feedbackContent = lang.feedback
        .replace("%1", senderName)
        .replace("%2", senderID)
        .replace("%3", groupDetails)
        .replace("%4", currentMsg.text);

      let sentBackAdminMsg = await bot.sendMessage(context.sourceChatId, feedbackContent, {
        reply_to_message_id: context.sourceMessageId,
        parse_mode: "HTML"
      });

      if (sentBackAdminMsg) {
        await bot.sendMessage(currentChatId, `🍓━━━━━━━━🍓\n✅ Message de suivi envoyé aux admins.\n🍓━━━━━━━━🍓`, { reply_to_message_id: currentMsg.message_id });
        
        global.telegramCalladMap.set(String(sentBackAdminMsg.message_id) + "_" + String(context.sourceChatId), {
          sourceChatId: currentChatId,
          sourceMessageId: currentMessageId,
          sourceUserId: senderID,
          type: "toAdmin"
        });
      }
    }
  } catch (err) {
    console.error("[callad-onChat] Échec du routage de la correspondance :", err.message);
  }
}

module.exports = { nix, onStart, onChat };
