const axios = require("axios");

const nix = {
  name: "pastebin",
  version: "1.1.0",
  aliases: ["paste"],
  description: "Téléverse du texte ou du code sur un Pastebin public stable",
  author: "Camille Uchiha",
  prefix: true,
  category: "utility",
  type: "anyone",
  cooldown: 5,
  guide: "{pn} [texte] ou en répondant à un message"
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
      console.error("[pastebin] Erreur d'envoi :", e.message);
    }
  };

  let textToPaste = args.join(" ").trim();

  // Vérification si c'est un Reply
  const replyToMessage = message?.reply_to_message || msg?.reply_to_message;
  if (!textToPaste && replyToMessage && replyToMessage.text) {
    textToPaste = replyToMessage.text;
  }

  if (!textToPaste) {
    return sendReply("❌ | Écris du texte après la commande ou réponds à un message contenant le texte à téléverser.");
  }

  let pasteUrl = null;

  // --- TENTATIVE 1 : paste.c-net.org ---
  try {
    const res = await axios.post("https://paste.c-net.org", textToPaste, {
      headers: { "Content-Type": "text/plain" },
      timeout: 8000
    });
    if (res.data && String(res.data).startsWith("http")) {
      pasteUrl = res.data.trim();
    }
  } catch (err) {
    console.log("[pastebin] Échec du premier serveur, tentative avec le secours...");
  }

  // --- TENTATIVE 2 : Secours (ix.io) ---
  if (!pasteUrl) {
    try {
      const params = new URLSearchParams();
      params.append("f:1", textToPaste);
      const resFallback = await axios.post("http://ix.io", params, { timeout: 8000 });
      if (resFallback.data && String(resFallback.data).startsWith("http")) {
        pasteUrl = resFallback.data.trim();
      }
    } catch (fallbackErr) {
      console.error("[pastebin] Échec du serveur de secours :", fallbackErr.message);
    }
  }

  // Si les deux serveurs ont échoué
  if (!pasteUrl) {
    return sendReply("❌ | Les serveurs d'hébergement sont saturés pour le moment. Réessaye dans quelques instants.");
  }

  const responseContent = `📋 ✦ 𝗣𝗔𝗦𝗧𝗘𝗕𝗜𝗡 ✦ 📋\n━━━━━━━━━━━━━━\n✓ | Texte téléversé avec succès !\n\n🔗 𝗟𝗶𝗲𝗻 𝗕𝗿𝘂𝘁 (𝗥𝗮𝘄) :\n${pasteUrl}\n━━━━━━━━━━━━━━\n⚡ 𝗘𝗱𝗶𝘁𝗲𝘂𝗿 : 𝗖𝗮𝗺𝗶𝗹𝗹𝗲 𝗨𝗰𝗵𝗶𝗵𝗮`;

  return sendReply(responseContent);
}

module.exports = { nix, onStart };
