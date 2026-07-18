const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "gpa",
  version: "1.0.1",
  aliases: ["setgroupimage", "setgpa"],
  description: "Change la photo du groupe en répondant à une image ou via un lien URL.",
  author: "Camille Uchiha",
  editor: "Camille Uchiha 🍓",
  prefix: true,
  category: "admin",
  type: "admin", // Restreint aux admins
  cooldown: 5,
  guide: "Répondez à une image avec {pn} OU utilisez {pn} [lien]"
};

// Liste des IDs Telegram numériques des administrateurs du bot
const ADMIN_IDS = ["61591108301616", "61577875842514"];

async function onStart({ bot, args, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  const senderID = String(currentMsg?.from?.id);
  const replyToMessage = currentMsg?.reply_to_message;

  const sendReply = async (text) => {
    try {
      if (currentMsg && typeof currentMsg.reply === "function") {
        return await currentMsg.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        return await bot.sendMessage(chatId, text);
      }
    } catch (e) {
      console.error("[gpa] Erreur d'envoi Telegram:", e.message);
    }
  };

  // 1. Vérification Admin du Bot
  if (!ADMIN_IDS.includes(senderID)) {
    return sendReply("🍓━━━━━━━━🍓\n❌ <b>ERREUR</b>\nRéservé aux administrateurs du bot.\n🍓━━━━━━━━🍓");
  }

  // 2. Vérification mode Groupe
  const isGroup = currentMsg.chat.type === "group" || currentMsg.chat.type === "supergroup";
  if (!isGroup) {
    return sendReply("🍓━━━━━━━━🍓\n❌ <b>ERREUR</b>\nCette commande doit être exécutée dans un groupe.\n🍓━━━━━━━━🍓");
  }

  let imageUrl = "";

  // 3. Extraction de l'image depuis un message répondu (Reply)
  if (replyToMessage && replyToMessage.photo && replyToMessage.photo.length > 0) {
    try {
      // Telegram envoie un tableau de différentes tailles, on prend la plus grande (le dernier élément)
      const fileId = replyToMessage.photo[replyToMessage.photo.length - 1].file_id;
      imageUrl = await bot.getFileLink(fileId);
    } catch (err) {
      console.error("[gpa] Impossible de récupérer le lien du fichier:", err.message);
    }
  } 
  // 4. Extraction de l'image depuis un lien URL direct donné en argument
  else if (args && args.length > 0) {
    imageUrl = args.join("").trim();
  }

  if (!imageUrl) {
    return sendReply("🍓━━━━━━━━🍓\n⚠️ <b>ATTENTION</b>\nRépondez à une image ou fournissez un lien valide.\n🍓━━━━━━━━🍓");
  }

  const cacheDir = path.join(__dirname, "cache");
  const cachePath = path.join(cacheDir, `gpa_${chatId}.png`);
  await fs.ensureDir(cacheDir);

  try {
    await sendReply("⚡ <b>Application de la nouvelle photo...</b>");

    // Téléchargement du flux de l'image
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Modification effective de l'avatar du chat sur Telegram
    await bot.setChatPhoto(chatId, cachePath);

    // Nettoyage immédiat du cache
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    return sendReply("🍓━━━━━━━━🍓\n✅ <b>SUCCÈS</b>\nPhoto du groupe mise à jour avec succès !\n🍓━━━━━━━━🍓");

  } catch (error) {
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    console.error("[gpa-error]", error);
    return sendReply("🍓━━━━━━━━🍓\n❌ <b>ÉCHEC</b>\nImpossible de modifier la photo. Vérifiez que le bot est bien administrateur avec le droit \"Changer les infos du groupe\".\n🍓━━━━━━━━🍓");
  }
}

module.exports = { nix, onStart };
