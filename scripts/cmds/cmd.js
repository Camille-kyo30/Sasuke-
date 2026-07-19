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
  version: "0.0.6",
  aliases: ["cm"],             
  description: "Gestion avancée des commandes",         
  author: "Camille Uchiha",             
  prefix: true,         
  category: "Admin",           
  type: "admin",         
  cooldown: 0,            
  guide: "/cmd <install|loadall|unload|reload> [name]"  
};

async function onStart({ message, args, userId }) {
    const config = loadConfig();
    if (!config.admin.includes(String(userId))) return message.reply("❌ Accès refusé.");

    const subcmd = args[0]?.toLowerCase();
    const cmdName = args[1];
    
    // Initialisation sécurité
    if (!global.teamnix) global.teamnix = { cmds: new Map() };
    const commands = global.teamnix.cmds;

    switch (subcmd) {
        case 'install': {
            if (!cmdName || !cmdName.endsWith('.js')) return message.reply('Usage: /cmd install name.js');
            
            // CORRECTION : On vérifie .text, .caption, et .body pour être sûr
            const msgReply = message.messageReply;
            const code = msgReply?.text || msgReply?.caption || msgReply?.body || (args[2] ? (await axios.get(args[2]).catch(() => ({data: null}))).data : null);
            
            if (!code) return message.reply('❌ Aucun code détecté. Réponds bien au message contenant le code.');
            
            const filePath = path.join(cmdFolder, cmdName);
            fs.writeFileSync(filePath, code, 'utf-8');
            
            try {
                delete require.cache[require.resolve(filePath)];
                const cmd = require(filePath);
                if (cmd.nix && cmd.nix.name) {
                    commands.set(cmd.nix.name.toLowerCase(), cmd);
                    message.reply(`✅ Installé et chargé: ${cmd.nix.name}`);
                }
            } catch (e) { message.reply(`❌ Erreur de chargement: ${e.message}`); }
            break;
        }

        case 'reload': {
            const filePath = path.join(cmdFolder, `${cmdName}.js`);
            if (!fs.existsSync(filePath)) return message.reply('❌ Fichier introuvable.');
            try {
                delete require.cache[require.resolve(filePath)];
                const cmd = require(filePath);
                if (cmd.nix && cmd.nix.name) {
                    commands.set(cmd.nix.name.toLowerCase(), cmd);
                    message.reply(`✅ Commande ${cmd.nix.name} rechargée.`);
                }
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
        
        case 'unload': {
            if (commands.has(cmdName)) {
                commands.delete(cmdName);
                message.reply(`✅ Commande ${cmdName} déchargée.`);
            } else {
                message.reply('❌ Commande introuvable.');
            }
            break;
        }

        default:
            message.reply('Options: install, loadall, unload, reload');
    }
}

module.exports = { nix, onStart };

