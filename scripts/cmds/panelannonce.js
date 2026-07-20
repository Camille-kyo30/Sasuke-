const nix = {
  name: "panelannonce",
  version: "1.0",
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
  const threadID = message.threadID || msg.threadID;

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

    return message.reply(panelText);
  }

  const subCommand = args[0].toLowerCase();

  if (subCommand === "urgent") {
    const text = args.slice(1).join(" ");
    if (!text) return message.reply("❌ Veuillez saisir le texte de l'annonce urgente.");

    const urgentFormatted = 
      "🚨 ══════════════════ 🚨\n" +
      "         **ANNONCE URGENTE**\n" +
      "🚨 ══════════════════ 🚨\n\n" +
      text + "\n\n" +
      "⚠️ *Veuillez prendre note de cette information importante.*";

    return message.reply(urgentFormatted);
  }

  const standardText = args.join(" ");
  const formatted = 
    "📢 ══════════════════ 📢\n" +
    "          **ANNONCE**\n" +
    "📢 ══════════════════ 📢\n\n" +
    standardText + "\n\n" +
    "📌 *Diffusé par la modération.*";

  return message.reply(formatted);
}

module.exports = { nix, onStart };
