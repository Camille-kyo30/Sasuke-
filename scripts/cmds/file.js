const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "file",
  version: "1.2",
  aliases: [],
  description: "Voir le code source d'une commande",
  author: "NeoKEX",
  prefix: true,
  category: "system",
  type: "anyone",
  cooldown: 5,
  guide: "{pn} <nom_de_la_commande>"
};

async function onStart({ bot, args, message, msg, usages }) {
  if (!args.length) {
    return msg.reply("❌ Usage : /file <nom_de_la_commande>");
  }

  const commandName = args[0].toLowerCase();
  
  // Note : Adapte 'global.GoatBot.commands' selon la structure de ton bot Telegram
  const allCommands = global.GoatBot.commands; 

  let command = allCommands.get(commandName);
  if (!command) {
    const cmd = [...allCommands.values()].find((c) =>
      (c.config.aliases || []).includes(commandName)
    );
    command = cmd;
  }

  if (!command) {
    return msg.reply("❌ Commande non trouvée.");
  }

  const actualCommandName = command.config.name;

  if (!/^[a-zA-Z0-9_-]+$/.test(actualCommandName)) {
    return msg.reply("❌ Nom de commande invalide.");
  }

  const allowedDir = path.resolve(__dirname);
  const filePath = path.resolve(__dirname, `${actualCommandName}.js`);

  if (!filePath.startsWith(allowedDir)) {
    return msg.reply("❌ Accès refusé : Tentative de traversal de chemin détectée.");
  }

  try {
    if (!fs.existsSync(filePath)) {
      return msg.reply("❌ Fichier non trouvé.");
    }

    const content = fs.readFileSync(filePath, "utf-8");

    if (content.length > 4000) {
      return msg.reply(`${content.substring(0, 3997)}...`);
    }

    return msg.reply(content);

  } catch (err) {
    return msg.reply(`❌ Erreur : ${err.message}`);
  }
}

module.exports = { nix, onStart };
