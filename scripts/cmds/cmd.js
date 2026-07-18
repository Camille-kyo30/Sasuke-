const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const nix = {
  name: "cmd",
  version: "1.17",
  aliases: [],
  description: "Gérer dynamiquement les fichiers de commandes",
  author: "NTKhang",
  prefix: true,
  category: "owner",
  type: "owner", // Limité à l'owner pour la sécurité
  cooldown: 5,
  guide: "{pn} load <nom_fichier> | loadAll | install <url> <nom_fichier>"
};

function getDomain(url) {
  const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function isURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

async function onStart({ bot, args, message, msg, usages }) {
  // Fonction de secours universelle pour répondre sur Telegram
  const sendReply = async (text) => {
    try {
      if (message && typeof message.reply === "function") {
        return await message.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        const chatId = message?.chat?.id || msg?.chat?.id;
        if (chatId) return await bot.sendMessage(chatId, text);
      } else if (msg && typeof msg.reply === "function") {
        return await msg.reply(text);
      }
    } catch (e) {
      console.error("[cmd] Erreur d'envoi Telegram:", e.message);
    }
  };

  if (!args.length) {
    return sendReply(`❌ Usage incorrect.\nGuide : ${nix.guide}`);
  }

  const action = args[0].toLowerCase();

  // --- ACTION : LOAD ---
  if (action === "load") {
    if (!args[1]) return sendReply("⚠ | Veuillez spécifier le nom du fichier à charger (sans .js).");
    const fileName = args[1];
    const filePath = path.join(__dirname, `${fileName}.js`);

    if (!fs.existsSync(filePath)) {
      return sendReply(`❌ Fichier introuvable : ${fileName}.js`);
    }

    try {
      delete require.cache[require.resolve(filePath)];
      const imported = require(filePath);
      
      if (global.GoatBot && global.GoatBot.commands) {
        const cmdName = imported.nix?.name || imported.config?.name || fileName;
        global.GoatBot.commands.set(cmdName, imported);
      }

      return sendReply(`✓ | La commande "${fileName}" a été rechargée avec succès !`);
    } catch (err) {
      return sendReply(`✗ | Échec du rechargement.\nErreur : ${err.message}`);
    }
  }

  // --- ACTION : LOADALL ---
  if (action === "loadall") {
    try {
      const files = fs.readdirSync(__dirname).filter(file => file.endsWith(".js") && file !== "cmd.js");
      let successCount = 0;
      let failMessages = [];

      for (const file of files) {
        try {
          const filePath = path.join(__dirname, file);
          delete require.cache[require.resolve(filePath)];
          const imported = require(filePath);

          if (global.GoatBot && global.GoatBot.commands) {
            const cmdName = imported.nix?.name || imported.config?.name || file.replace(".js", "");
            global.GoatBot.commands.set(cmdName, imported);
          }
          successCount++;
        } catch (e) {
          failMessages.push(`• ${file} => ${e.message}`);
        }
      }

      let response = `✓ | ${successCount} commandes chargées avec succès.`;
      if (failMessages.length > 0) {
        response += `\n\n✗ | Échecs (${failMessages.length}) :\n${failMessages.join("\n")}`;
      }
      return sendReply(response);
    } catch (err) {
      return sendReply(`❌ Erreur dossier : ${err.message}`);
    }
  }

  // --- ACTION : INSTALL ---
  if (action === "install") {
    let url = args[1];
    let fileName = args[2];
    let rawCode = "";

    if (!url || !fileName) {
      return sendReply("⚠ | Usage : install <url_raw> <nom_de_fichier.js>");
    }

    if (!fileName.endsWith(".js")) fileName += ".js";

    if (url.match(/(https?:\/\/(?:www\.|(?!www)))/)) {
      const domain = getDomain(url);
      if (!domain) return sendReply("⚠ | URL invalide.");

      try {
        if (domain === "pastebin.com" && !url.includes("/raw/")) {
          url = url.replace("pastebin.com/", "pastebin.com/raw/");
        } else if (domain === "github.com" && url.includes("/blob/")) {
          url = url.replace("github.com/", "raw.githubusercontent.com/").replace("/blob/", "/");
        }

        const res = await axios.get(url);
        rawCode = typeof res.data === "object" ? JSON.stringify(res.data) : res.data;

        if (domain === "savetext.net") {
          const $ = cheerio.load(rawCode);
          rawCode = $("#content").text();
        }
      } catch (err) {
        return sendReply(`❌ Impossible de récupérer le code depuis l'URL : ${err.message}`);
      }
    }

    if (!rawCode) return sendReply("❌ Code source vide ou introuvable.");

    const targetPath = path.join(__dirname, fileName);

    try {
      fs.writeFileSync(targetPath, rawCode, "utf-8");
      
      // Tentative de chargement immédiat du fichier installé
      delete require.cache[require.resolve(targetPath)];
      const loadedModule = require(targetPath);

      if (global.GoatBot && global.GoatBot.commands) {
        const cmdName = loadedModule.nix?.name || loadedModule.config?.name || fileName.replace(".js", "");
        global.GoatBot.commands.set(cmdName, loadedModule);
      }

      return sendReply(`✓ | Commande installée et activée avec succès !\nFichier enregistré : ${fileName}`);
    } catch (err) {
      return sendReply(`✗ | Fichier enregistré mais erreur lors de la compilation : ${err.message}`);
    }
  }

  return sendReply("❌ Action inconnue. Utilisez 'load', 'loadall' ou 'install'.");
}

module.exports = { nix, onStart };
