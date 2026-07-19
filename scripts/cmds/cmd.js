const fs = require("fs");
const path = require("path");

const nix = {
  name: "cmd",
  version: "1.17",
  aliases: ["cm"],             
  description: "Gérer les fichiers de commandes",         
  author: "Camille Uchiha 🍓",             
  prefix: true,         
  category: "owner",           
  type: "admin",         
  cooldown: 5,            
  guide: "{pn} load <nom> | {pn} loadAll"  
};

async function onStart({ bot, args, message, msg, chatId }) {
  const currentMsg = message || msg;
  
  // Correction : On cible global.GoatBot.utils au lieu de global.utils
  const utils = global.GoatBot?.utils || global.utils;
  
  if (!utils) {
    return bot.sendMessage(chatId, "❌ Erreur : Les outils du bot ne sont pas accessibles.");
  }

  const { loadScripts } = utils;
  const action = args[0];

  if (action === "load") {
    const fileName = args[1];
    if (!fileName) return bot.sendMessage(chatId, "❌ Spécifie un nom de fichier.");
    
    try {
      const result = loadScripts("cmds", fileName, utils.log, global.GoatBot.configCommands, bot);
      bot.sendMessage(chatId, result.status === "success" ? `✅ Commande "${fileName}" chargée.` : `❌ Erreur : ${result.error?.message}`);
    } catch (e) {
      bot.sendMessage(chatId, `❌ Erreur système : ${e.message}`);
    }
  } 
  else if (action === "loadAll") {
    const dir = path.join(process.cwd(), "scripts", "cmds");
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
    let successCount = 0;
    
    for (const file of files) {
      const name = file.replace(".js", "");
      const res = loadScripts("cmds", name, utils.log, global.GoatBot.configCommands, bot);
      if (res.status === "success") successCount++;
    }
    bot.sendMessage(chatId, `✅ ${successCount} commandes rechargées.`);
  }
}

module.exports = { nix, onStart };
