const fs = require('fs');
const path = require('path');
const axios = require('axios');

const cmdFolder = __dirname;
const configPath = path.join(__dirname, '..', '..', 'config.json');

function loadConfig() {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
    catch (e) { return { admin: [] }; }
}

const nix = {
  name: "cmd",
  version: "0.0.7",
  aliases: ["cm"],             
  description: "Gestion des commandes",         
  author: "Camille Uchiha",             
  prefix: true,         
  category: "Admin",           
  type: "admin",         
  cooldown: 0,            
  guide: "/cmd <install|loadall|unload|reload> [name]"  
};

async function onStart({ message, args, userId }) {
    const config = loadConfig();
    if (!config.admin.includes(String(userId))) return message.reply("❌ Accès réservé aux admins.");

    const subcmd = args[0]?.toLowerCase();
    const cmdName = args[1];
    
    // Assure l'existence du registre global
    if (!global.teamnix) global.teamnix = { cmds: new Map() };
    const commands = global.teamnix.cmds;

    switch (subcmd) {
        case 'install': {
            if (!cmdName || !cmdName.endsWith('.js')) return message.reply('Usage: /cmd install name.js');
            
            // Correction ici : récupère le contenu du message auquel on répond
            const targetMsg = message.messageReply || message.reply_to_message;
            const code = targetMsg?.text || targetMsg?.caption || targetMsg?.body;
            
            if (!code) return message.reply('❌ Aucun code détecté dans le message répondu.');
            
            const filePath = path.join(cmdFolder, cmdName);
            fs.writeFileSync(filePath, code, 'utf-8');
            
            try {
                delete require.cache[require.resolve(filePath)];
                const cmd = require(filePath);
                if (cmd.nix && cmd.nix.name) {
                    commands.set(cmd.nix.name.toLowerCase(), cmd);
                    message.reply(`✅ Installé et chargé: ${cmd.nix.name}`);
                } else {
                    message.reply('❌ Erreur: Structure nix manquante dans le fichier.');
                }
            } catch (e) { message.reply(`❌ Erreur: ${e.message}`); }
            break;
        }

        case 'reload': {
            const filePath = path.join(cmdFolder, `${cmdName}.js`);
            if (!fs.existsSync(filePath)) return message.reply('❌ Fichier introuvable.');
            try {
                delete require.cache[require.resolve(filePath)];
                const cmd = require(filePath);
                commands.set(cmd.nix.name.toLowerCase(), cmd);
                message.reply(`✅ Commande ${cmd.nix.name} rechargée.`);
            } catch (e) { message.reply(`❌ Erreur: ${e.message}`); }
            break;
        }

        case 'loadall': {
            const files = fs.readdirSync(cmdFolder).filter(f => f.endsWith('.js') && f !== 'cmd.js');
            let count = 0;
            for (const file of files) {
                try {
                    const filePath = path.join(cmdFolder, file);
                    delete require.cache[require.resolve(filePath)];
                    const cmd = require(filePath);
                    if (cmd.nix && cmd.nix.name) {
                        commands.set(cmd.nix.name.toLowerCase(), cmd);
                        count++;
                    }
                } catch (e) { continue; }
            }
            message.reply(`✅ ${count} commandes chargées.`);
            break;
        }

        default:
            message.reply('Commandes: install, reload, loadall, unload');
    }
}

module.exports = { nix, onStart };
