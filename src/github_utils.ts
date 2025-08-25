export const importAlgo = {
	name: 'RSASSA-PKCS1-v1_5',
	hash: { name: 'SHA-256' },
}


// From https://github.com/mdn/dom-examples/blob/085b5952ccc3171b1075c4027868b191a745d3cf/web-crypto/import-key/pkcs8.js
function str2ab(str: string) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
    // fetch the part of the PEM string between header and footer
    // GitHub sends the private key in PKCS#1 format, but WebCrypto requires PKCS#8
    // so we need to convert it to PKCS#8
    // openssl pkcs8 -topk8 -inform PEM -outform DER -in filename -out filename -nocrypt
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    // base64 decode the string to get the binary data
    const binaryDerString = atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      importAlgo,
      true,
      ["sign"]
    );
  }

