const axios = require("axios");

const nix = {
  name: "pastebin",
  version: "1.0.0",
  aliases: ["paste"],
  description: "Téléverse du texte ou du code sur un Pastebin public",
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

  try {
    // Envoi vers un service de paste anonyme et rapide (ix.io ou sprunge.us)
    // Ici on utilise sprunge.us qui accepte les requêtes POST simples
    const params = new URLSearchParams();
    params.append("sprunge", textToPaste);

    const res = await axios.post("http://sprunge.us", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const pasteUrl = res.data.trim();

    if (!pasteUrl || !pasteUrl.startsWith("http")) {
      throw new Error("Réponse invalide du serveur de paste.");
    }

    const responseContent = `📋 ✦ 𝗣𝗔𝗦𝗧𝗘𝗕𝗜𝗡 ✦ 📋\n━━━━━━━━━━━━━━\n✓ | Texte téléversé avec succès !\n\n🔗 𝗟𝗶𝗲𝗻 𝗕𝗿𝘂𝘁 (𝗥𝗮𝘄) :\n${pasteUrl}\n━━━━━━━━━━━━━━\n⚡ 𝗘𝗱𝗶𝘁𝗲𝘂𝗿 : 𝗖𝗮𝗺𝗶𝗹𝗹𝗲 𝗨𝗰𝗵𝗶𝗵𝗮`;

    return sendReply(responseContent);

  } catch (err) {
    console.error("Erreur Pastebin :", err.message);
    return sendReply("❌ | Impossible de créer le Pastebin pour le moment. Réessaye plus tard.");
  }
}

module.exports = { nix, onStart };
