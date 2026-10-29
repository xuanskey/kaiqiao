// TEST ONLY: ephemeral keypair. Never opens the real issuer key.
import { webcrypto } from 'node:crypto';
import { encodePayload, encodeBase32 } from '../site/www.yanghat.cn/topup-core.js';
export async function testSigner(context) {
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const publicKeyJwk=await webcrypto.subtle.exportKey('jwk',pair.publicKey);
  await context.route('**/topup-config.js',route=>route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify({publicKeyJwk})};`}));
  return async order=>{
    const payload=encodePayload(order.id,order.points),bytes=new Uint8Array(79);
    bytes.set(payload);bytes.set(new Uint8Array(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,payload)),15);
    return encodeBase32(bytes);
  };
}
