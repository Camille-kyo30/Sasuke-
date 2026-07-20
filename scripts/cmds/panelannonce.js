const nix = {
  name: "panelannonce",
  version: "1.1",
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
  // Récupération sécurisée du threadID (groupe ou privé) selon l'objet disponible
  const threadID = message?.threadID || msg?.threadID || message?.chatId || msg?.chatId;

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

    return bot.sendMessage(panelText, threadID);
  }

  const subCommand = args[0].toLowerCase();

  if (subCommand === "urgent") {
    const text = args.slice(1).join(" ");
    if (!text) return bot.sendMessage("❌ Veuillez saisir le texte de l'annonce urgente.", threadID);

    const urgentFormatted = 
      "🚨 ══════════════════ 🚨\n" +
      "         **ANNONCE URGENTE**\n" +
      "🚨 ══════════════════ 🚨\n\n" +
      text + "\n\n" +
      "⚠️ *Veuillez prendre note de cette information importante.*";

    return bot.sendMessage(urgentFormatted, threadID);
  }

  const standardText = args.join(" ");
  const formatted = 
    "📢 ══════════════════ 📢\n" +
    "          **ANNONCE**\n" +
    "📢 ══════════════════ 📢\n\n" +
    standardText + "\n\n" +
    "📌 *Diffusé par la modération.*";

  return bot.sendMessage(formatted, threadID);
}

module.exports = { nix, onStart };
