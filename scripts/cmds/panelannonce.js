const nix = {
  name: "panelannonce",
  version: "1.2",
  aliases: ["annonce", "annonces"],
  description: "Panneau d'annonces pour diffuser des messages formés et urgents dans le groupe",
  author: "Camille Uchiha",
  prefix: true,
  category: "Administration",
  type: "admin",
  cooldown: 5,
  guide: "{p}panelannonce <texte> ou {p}panelannonce urgent <texte>"
};

async function onStart({ bot, args, message, msg, usages }) {
  // Récupération sécurisée du chat ID pour Telegram
  const chatID = message?.chat?.id || msg?.chat?.id || message?.threadID || msg?.threadID;

  if (!chatID) {
    console.error("Erreur PanelAnnonce : Impossible de récupérer le chatID.", { message, msg });
    return;
  }

  if (!args || args.length === 0) {
    const panelText = 
      "╔════════════════════╗\n" +
      "    📢 **PANEL ANNONCE**    \n" +
      "╚════════════════════╝\n\n" +
      "• Pour envoyer une annonce simple :\n" +
      "  `!panelannonce [votre texte]`\n\n" +
      "• Pour une annonce urgente :\n" +
      "  `!panelannonce urgent [texte]`\n\n" +
      "📌 *Utilisez les commandes ci-dessus pour diffuser vos informations.*";

    return bot.sendMessage(chatID, panelText, { parse_mode: "Markdown" }).catch(() => bot.sendMessage(chatID, panelText));
  }

  const subCommand = args[0].toLowerCase();

  if (subCommand === "urgent") {
    const text = args.slice(1).join(" ");
    if (!text) return bot.sendMessage(chatID, "❌ Veuillez saisir le texte de l'annonce urgente.");

    const urgentFormatted = 
      "🚨 ══════════════════ 🚨\n" +
      "         **ANNONCE URGENTE**\n" +
      "🚨 ══════════════════ 🚨\n\n" +
      text + "\n\n" +
      "⚠️ *Veuillez prendre note de cette information importante.*";

    return bot.sendMessage(chatID, urgentFormatted, { parse_mode: "Markdown" }).catch(() => bot.sendMessage(chatID, urgentFormatted));
  }

  const standardText = args.join(" ");
  const formatted = 
    "📢 ══════════════════ 📢\n" +
    "          **ANNONCE**\n" +
    "📢 ══════════════════ 📢\n\n" +
    standardText + "\n\n" +
    "📌 *Diffusé par la modération.*";

  return bot.sendMessage(chatID, formatted, { parse_mode: "Markdown" }).catch(() => bot.sendMessage(chatID, formatted));
}

module.exports = { nix, onStart };
