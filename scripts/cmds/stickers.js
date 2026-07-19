const nix = {
  name: "stickers",
  version: "1.0.0",
  aliases: ["stk"],
  description: "Transforme une image en plusieurs stickers",
  author: "Camille Uchiha 🍓",
  prefix: true,
  category: "utility",
  type: "anyone",
  cooldown: 10,
  guide: "Réponds à une image avec /stickers"
};

const axios = require('axios');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas'); // Assure-toi d'avoir 'canvas' installé

async function onStart({ bot, message, msg, chatId }) {
  const currentMsg = message || msg;
  const reply = currentMsg.messageReply?.attachments?.[0];

  if (!reply || reply.type !== 'photo') {
    return bot.sendMessage(chatId, "❌ Veuillez répondre à une image pour la découper en stickers.");
  }

  try {
    bot.sendMessage(chatId, "⏳ Découpage de l'image en cours...");
    
    const image = await loadImage(reply.url);
    const width = image.width / 2; // Exemple : diviser en 4 (grille 2x2)
    const height = image.height / 2;

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, i * width, j * height, width, height, 0, 0, width, height);
        
        const buffer = canvas.toBuffer('image/png');
        // Ici, envoie le buffer comme sticker selon ton API de bot (ex: bot.sendSticker)
        await bot.sendSticker(chatId, buffer);
      }
    }
  } catch (err) {
    bot.sendMessage(chatId, `❌ Erreur : ${err.message}`);
  }
}

module.exports = { nix, onStart };
