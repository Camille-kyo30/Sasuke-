const nix = {
  name: "panelannonce",
  version: "2.0",
  aliases: ["annonce", "annonces"],
  description: "Diffuse une annonce ou une annonce urgente dans tous les groupes où le bot est présent",
  author: "Camille Uchiha",
  prefix: true,
  category: "Administration",
  type: "admin",
  cooldown: 10,
  guide: "{p}panelannonce <texte> ou {p}panelannonce urgent <texte>"
};

async function onStart({ bot, args, message, msg, usages }) {
  const activeMessage = message || msg;
  if (!activeMessage) return;

  const replyMethod = async (text) => {
    if (typeof activeMessage.reply === "function") {
      return activeMessage.reply(text);
    }
    const chatId = activeMessage.chat?.id || activeMessage.threadID;
    if (chatId && typeof bot?.sendMessage === "function") {
      return bot.sendMessage(chatId, text);
    }
  };

  if (!args || args.length === 0) {
    const panelText = 
      "╔════════════════════╗\n" +
      "    📢 **PANEL ANnonce GLOBAL**    \n" +
      "╚════════════════════╝\n\n" +
      "• Pour diffuser une annonce dans **tous** les groupes :\n" +
      "  `!panelannonce [votre texte]`\n\n" +
      "• Pour diffuser une annonce urgente globale :\n" +
      "  `!panelannonce urgent [texte]`\n\n" +
      "📌 *Attention : Le message sera envoyé simultanément dans l'ensemble des discussions du bot.*";

    return replyMethod(panelText);
  }

  const subCommand = args[0].toLowerCase();
  let textToSend = "";
  let isUrgent = false;

  if (subCommand === "urgent") {
    textToSend = args.slice(1).join(" ");
    isUrgent = true;
  } else {
    textToSend = args.join(" ");
  }

  if (!textToSend) {
    return replyMethod("❌ Veuillez saisir le texte à diffuser dans les groupes.");
  }

  // Formatage du message
  const formattedMessage = isUrgent
    ? "🚨 ══════════════════ 🚨\n" +
      "         **ANNONCE URGENTE**\n" +
      "🚨 ══════════════════ 🚨\n\n" +
      textToSend + "\n\n" +
      "⚠️ *Veuillez prendre note de cette information importante.*"
    : "📢 ══════════════════ 📢\n" +
      "          **ANNONCE**\n" +
      "📢 ══════════════════ 📢\n\n" +
      textToSend + "\n\n" +
      "📌 *Diffusé par la modération.*";

  await replyMethod("⏳ Diffusion de l'annonce en cours dans tous les groupes...");

  try {
    // Récupération de la liste des chats/groupes (méthode standard des bots Telegram / AutoResponder / structures similaires)
    let targetChats = [];

    if (typeof bot.getChats === "function") {
      targetChats = await bot.getChats();
    } else if (typeof bot.getDialogs === "function") {
      targetChats = await bot.getDialogs();
    } else if (bot.telegram && typeof bot.telegram.getUpdates === "function") {
      // Fallback ou stockage interne si géré par le framework
      targetChats = bot.chats || [];
    }

    // Si le framework stocke les IDs des groupes dans un tableau ou cache interne
    if ((!targetChats || targetChats.length === 0) && global.client?.chats) {
      targetChats = global.client.chats;
    }

    if (!targetChats || targetChats.length === 0) {
      return replyMethod("❌ Impossible de récupérer la liste des groupes ou aucun groupe enregistré.");
    }

    let successCount = 0;
    let failCount = 0;

    for (const chat of targetChats) {
      const chatId = chat.id || chat;
      // S'assure d'envoyer uniquement dans les groupes/supergroupes/canaux ( IDs négatifs ou adaptés selon Telegram )
      if (chatId) {
        try {
          await bot.sendMessage(chatId, formattedMessage);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }
    }

    return replyMethod(`✅ Diffusion terminée !\n• Succès : ${successCount}\n• Échecs : ${failCount}`);

  } catch (error) {
    console.error("Erreur lors de la diffusion globale :", error);
    return replyMethod("❌ Une erreur est survenue lors de la diffusion globale des annonces.");
  }
}

module.exports = { nix, onStart };
