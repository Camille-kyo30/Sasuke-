const fs = require("fs");
const path = require("path");
const axios = require("axios");

const nix = {
  name: "pastebin",
  version: "1.2.0",
  aliases: ["bin"],
  description: "Téléverse le code d'une commande du bot et génère un lien brut",
  author: "ArYAN x Camille Uchiha",
  prefix: true,
  category: "utility",
  type: "anyone",
  cooldown: 5,
  guide: "{pn} [nom_du_fichier] (ex: {pn} mini)"
};

async function onStart({ bot, args, message, msg, usages }) {
  const sendReply = async (text) => {
    try {
      if (message && typeof message.reply === "function") {
        return await message.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        const chatId = message?.chat?.id || msg?.chat?.id;
        if (chatId) return await bot.sendMessage(chatId, text);
      }
    } catch (e) {
      console.error("[pastebin-file] Erreur d'envoi Telegram :", e.message);
    }
  };

  if (args.length === 0) {
    return sendReply("⚠️ Spécifie le nom du fichier de commande à téléverser. Exemple : `/pastebin mini`.");
  }

  const fileName = args[0];
  
  // Résolution du chemin vers ton dossier de commandes actuel
  const filePathWithoutExtension = path.join(__dirname, fileName);
  const filePathWithExtension = path.join(__dirname, fileName + ".js");

  let filePath = null;
  if (fs.existsSync(filePathWithoutExtension) && fs.statSync(filePathWithoutExtension).isFile()) {
    filePath = filePathWithoutExtension;
  } else if (fs.existsSync(filePathWithExtension)) {
    filePath = filePathWithExtension;
  }

  if (!filePath) {
    return sendReply("❌ Fichier ou commande introuvable dans le dossier.");
  }

  try {
    const fileData = fs.readFileSync(filePath, "utf8");
    let pasteUrl = null;

    // --- TENTATIVE 1 : Serveur Principal ---
    try {
      const res = await axios.post("https://paste.c-net.org", fileData, {
        headers: { "Content-Type": "text/plain" },
        timeout: 8000
      });
      if (res.data && String(res.data).startsWith("http")) {
        pasteUrl = res.data.trim();
      }
    } catch (err) {
      console.log("[pastebin-file] Échec du premier serveur, bascule sur le secours...");
    }

    // --- TENTATIVE 2 : Serveur Secours ---
    if (!pasteUrl) {
      try {
        const params = new URLSearchParams();
        params.append("f:1", fileData);
        const resFallback = await axios.post("http://ix.io", params, { timeout: 8000 });
        if (resFallback.data && String(resFallback.data).startsWith("http")) {
          pasteUrl = resFallback.data.trim();
        }
      } catch (fallbackErr) {
        console.error("[pastebin-file] Échec du secours :", fallbackErr.message);
      }
    }

    if (!pasteUrl) {
      return sendReply("❌ Impossible d'héberger le fichier pour le moment. Réessaye plus tard.");
    }

    const responseContent = `📋 ✦ 𝗖𝗢𝗗𝗘 𝗧𝗘𝗟𝗘𝗩𝗘𝗥𝗦𝗘 ✦ 📋\n━━━━━━━━━━━━━━\n✓ | Fichier [ ${path.basename(filePath)} ] chargé.\n\n🔗 𝗟𝗶𝗲𝗻 𝗕𝗿𝘂𝘁 (𝗥𝗮𝘄) :\n${pasteUrl}\n━━━━━━━━━━━━━━\n⚡ 𝗘𝗱𝗶𝘁𝗲𝘂𝗿 : 𝗖𝗮𝗺𝗶𝗹𝗹𝗲 𝗨𝗰𝗵𝗶𝗵𝗮`;

    return sendReply(responseContent);

  } catch (err) {
    console.error(err);
    return sendReply("⚠️ Une erreur est survenue lors de la lecture ou de l'envoi du fichier.");
  }
}

module.exports = { nix, onStart };
