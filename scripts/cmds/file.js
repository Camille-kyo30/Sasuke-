const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "file",
  version: "1.4",
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
  // Fonction interne de secours pour envoyer un message peu importe la structure du framework
  const sendReply = async (text) => {
    try {
      if (message && typeof message.reply === "function") {
        return await message.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        const chatId = message?.chat?.id || msg?.chat?.id || event?.chat?.id;
        if (chatId) return await bot.sendMessage(chatId, text);
      } else if (msg && typeof msg.reply === "function") {
        return await msg.reply(text);
      }
      console.log(`[file] Impossible de répondre via le framework, texte : ${text}`);
    } catch (e) {
      console.error("[file] Échec de l'envoi du message:", e.message);
    }
  };

  if (!args.length) {
    return sendReply("❌ Usage : /file <nom_de_la_commande>");
  }

  const commandName = args[0].toLowerCase();
  let actualCommandName = commandName;

  // Gestion des alias si global.GoatBot existe
  if (global.GoatBot && global.GoatBot.commands) {
    const allCommands = global.GoatBot.commands;
    let command = allCommands.get(commandName);
    if (!command) {
      const cmd = [...allCommands.values()].find((c) =>
        (c.config?.aliases || c.nix?.aliases || []).includes(commandName)
      );
      command = cmd;
    }
    if (command) {
      actualCommandName = command.config?.name || command.nix?.name || commandName;
    }
  }

  // Sécurité anti-traversée de chemin
  if (!/^[a-zA-Z0-9_-]+$/.test(actualCommandName)) {
    return sendReply("❌ Nom de commande invalide.");
  }

  const allowedDir = path.resolve(__dirname);
  const filePath = path.resolve(__dirname, `${actualCommandName}.js`);

  if (!filePath.startsWith(allowedDir)) {
    return sendReply("❌ Accès refusé : Tentative de traversal de chemin détectée.");
  }

  try {
    if (!fs.existsSync(filePath)) {
      return sendReply(`❌ Fichier non trouvé : ${actualCommandName}.js`);
    }

    const content = fs.readFileSync(filePath, "utf-8");

    if (content.length > 4000) {
      return sendReply(`${content.substring(0, 3997)}...`);
    }

    return sendReply(content);

  } catch (err) {
    return sendReply(`❌ Erreur : ${err.message}`);
  }
}

module.exports = { nix, onStart };
