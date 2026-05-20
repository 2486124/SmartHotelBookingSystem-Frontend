import * as fs from 'fs';
import * as path from 'path';

const apiUrl: string = process.env['API_URL'] ?? 'http://localhost:9091';
const imagekitPublicKey: string = process.env['IMAGEKIT_PUBLIC_KEY'] ?? '';
const imagekitPrivateKey: string = process.env['IMAGEKIT_PRIVATE_KEY'] ?? '';
const imagekitUrlEndpoint: string = process.env['IMAGEKIT_URL_ENDPOINT'] ?? '';

const content: string = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  imageKit: {
    publicKey: '${imagekitPublicKey}',
    privateKey: '${imagekitPrivateKey}',
    urlEndpoint: '${imagekitUrlEndpoint}'
  }
};
`;

const targetPath: string = path.resolve(__dirname, '../src/environments/environment.prod.ts');

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, 'utf8');

console.log(`environment.prod.ts generated successfully at ${targetPath}`);
