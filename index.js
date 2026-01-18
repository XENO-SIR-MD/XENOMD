const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const readline = require("readline");
const pino = require("pino");

// --- CONFIGURATION ---
const OWNER_NAME = "XENO MD BOT";
const BOT_NAME = "XENO MD";
// ---------------------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false 
    });

    if (!sock.authState.creds.registered) {
        console.log(`\n=== ${OWNER_NAME} SETUP ===`);
        const phoneNumber = await question('Enter Phone Number (ex: 919876543210): ');
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        console.log(`\nYour Pairing Code: ${code}\n`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`${BOT_NAME} is now Online!`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const from = msg.key.remoteJid;

        // COMMANDS
        if (text?.toLowerCase() === 'menu' || text?.toLowerCase() === 'help') {
            await sock.sendMessage(from, { 
                text: `Hello! I am ${BOT_NAME}.\nOwner: ${OWNER_NAME}\n\nCommands:\n1. .status\n2. .ping` 
            });
        }

        if (text?.toLowerCase() === '.status') {
            await sock.sendMessage(from, { text: `${BOT_NAME} is active and running.` });
        }
    });
}

startBot();
