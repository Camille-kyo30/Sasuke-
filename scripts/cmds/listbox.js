const nix = {
  name: "listbox",
  version: "1.1.0",
  aliases: ["groupslist", "boxlist"],
  description: "Affiche tous les noms de groupes et leurs ID où le bot est membre.",
  author: "ArYAN",
  editor: "Camille Uchiha 🍓",
  prefix: true,
  category: "system",
  type: "admin", // Restreint aux administrateurs du bot
  cooldown: 10,
  guide: "{pn}"
};

// Liste des IDs Telegram numériques des administrateurs autorisés
const ADMIN_IDS = ["61591108301616", "61577875842514"];

async function onStart({ bot, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  const senderID = String(currentMsg?.from?.id);

  const sendReply = async (text) => {
    try {
      if (currentMsg && typeof currentMsg.reply === "function") {
        return await currentMsg.reply(text, { parse_mode: "HTML" });
      } else if (bot && typeof bot.sendMessage === "function") {
        return await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
    } catch (e) {
      console.error("[listbox] Erreur d'envoi Telegram:", e.message);
    }
  };

  // 1. Vérification des privilèges Admin
  if (!ADMIN_IDS.includes(senderID)) {
    return sendReply("🍓━━━━━━━━🍓\n❌ <b>ERREUR</b>\nRéservé aux administrateurs du bot.\n🍓━━━━━━━━🍓");
  }

  try {
    let activeGroups = [];

    // 2. Récupération des groupes enregistrés dans SQLite/Database
    if (global.threadsData && typeof global.threadsData.getAll === "function") {
      const storedThreads = await global.threadsData.getAll();
      // On filtre pour s'assurer qu'il s'agit bien d'IDs de groupes (souvent négatifs sur Telegram)
      activeGroups = storedThreads.filter(t => t.isGroup || String(t.threadID).startsWith("-"));
    }

    if (activeGroups.length === 0) {
      return sendReply("🍓━━━━━━━━🍓\n❌ <b>ERREUR</b>\nAucun groupe enregistré trouvé dans la base de données.\n🍓━━━━━━━━🍓");
    }

    let responseMsg = `🍓━━━━━━━━🍓\n🎯 <b>TOTAL GROUPES:</b> ${activeGroups.length}\n🍓━━━━━━━━🍓\n\n`;

    for (let index = 0; index < activeGroups.length; index++) {
      const group = activeGroups[index];
      let groupName = group.name || "Groupe sans nom";
      let memberCount = "N/A";

      // 3. Récupération dynamique des infos fraîches via l'API Telegram
      try {
        const chatDetails = await bot.getChat(group.threadID);
        groupName = chatDetails.title || groupName;
        memberCount = await bot.getChatMemberCount(group.threadID);
      } catch (chatErr) {
        // Le bot a pu être banni ou le groupe supprimé entre-temps
        groupName += " <i>(Inaccessible / Quitté)</i>";
      }

      responseMsg += `📦 <b>Groupe ${index + 1}:</b>\n`;
      responseMsg += `📌 <b>Nom:</b> ${groupName}\n`;
      responseMsg += `🆔 <b>ID:</b> <code>${group.threadID}</code>\n`;
      responseMsg += `👥 <b>Membres:</b> ${memberCount}\n`;
      responseMsg += `━━━━━━━━━━━━━━━━\n`;
    }

    responseMsg += `\n🍓━━━━━━━━🍓\n💡 Utilise l'ID pour les commandes d'admin\n🍓━━━━━━━━🍓`;
    return sendReply(responseMsg);

  } catch (error) {
    return sendReply(
      `🍓━━━━━━━━🍓\n⚠️ <b>ERREUR</b>\nErreur lors de la récupération de la liste:\n${error.message}\n🍓━━━━━━━━🍓`
    );
  }
}

module.exports = { nix, onStart };
