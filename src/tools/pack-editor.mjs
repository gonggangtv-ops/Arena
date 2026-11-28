// A regular build needs only the public key. The owner's passphrase unwraps the private
// key in Web Crypto when opening the page. Neither the password nor a session is shipped.
import { createCipheriv, createHash, generateKeyPairSync, pbkdf2Sync, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const accessPath = resolve(root, 'arena-editor-access.json');
const testOutput = process.argv[2] === '--test-output' ? resolve(process.argv[3]) : null;
const output = testOutput || resolve(root, '../app/src/main/assets/editor.html');
const read = file => readFileSync(resolve(root, file), 'utf8');
const b64 = bytes => bytes.toString('base64');

function seal(data, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return { iv: b64(iv), data: b64(encrypted) };
}

function newAccess() {
  const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
  if (password.length < 12 || /[\r\n]/.test(password)) throw Error('Use a single passphrase of at least 12 characters on stdin.');
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
  const salt = randomBytes(16), iterations = 600000;
  const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }), salt: b64(salt), iterations,
    locked: seal(privateKey.export({ type: 'pkcs8', format: 'der' }), key)
  };
}
if (process.argv[2] === '--set-password')writeFileSync(accessPath, JSON.stringify(newAccess(), null, 2) + '\n');
const access = testOutput ? newAccess() : JSON.parse(readFileSync(accessPath, 'utf8'));
const gate = read('editor-gate.html');
const payload = JSON.stringify({
  html: read('arena-editor.html'), css: read('arena-editor.css'),
  js: [read('editor-catalog-ui.js'), read('editor-project-files.js'), read('arena-editor.js')].join('\n')
});
const revision = createHash('sha256').update(gate).update(payload).update(JSON.stringify(access)).update('editor-envelope-v1').digest('hex');
const marker = '<!-- editor-build ' + revision + ' -->';
if (!existsSync(output) || !readFileSync(output, 'utf8').includes(marker)) {
  const key = randomBytes(32);
  const session = publicEncrypt({ key: access.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  const envelope = { salt: access.salt, iterations: access.iterations, locked: access.locked, session: b64(session), payload: seal(payload, key) };
  const page = gate.replace('<!--BUILD-->', marker).replace('/*ENVELOPE*/null', JSON.stringify(envelope));
  writeFileSync(output + '.tmp', page);
  renameSync(output + '.tmp', output);
}
console.log('Packaged editor.html');
