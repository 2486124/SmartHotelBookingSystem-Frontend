import * as fs from 'fs';
import * as path from 'path';

const apiUrl: string = process.env['API_URL'] ?? 'http://localhost:9091';
const imagekitPublicKey: string = process.env['IMAGEKIT_PUBLIC_KEY'] ?? '';
const imagekitPrivateKey: string = process.env['IMAGEKIT_PRIVATE_KEY'] ?? '';
const imagekitUrlEndpoint: string = process.env['IMAGEKIT_URL_ENDPOINT'] ?? '';

const envContent: string = `export const environment = {
  production: false,
  apiUrl: '${apiUrl}',
  imageKit: {
    publicKey: '${imagekitPublicKey}',
    privateKey: '${imagekitPrivateKey}',
    urlEndpoint: '${imagekitUrlEndpoint}'
  }
};
`;

const envProdContent: string = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  imageKit: {
    publicKey: '${imagekitPublicKey}',
    privateKey: '${imagekitPrivateKey}',
    urlEndpoint: '${imagekitUrlEndpoint}'
  }
};
`;

const envDir: string = path.resolve(process.cwd(), 'src/environments');

fs.mkdirSync(envDir, { recursive: true });
fs.writeFileSync(path.join(envDir, 'environment.ts'), envContent, 'utf8');
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), envProdContent, 'utf8');

console.log('environment.ts and environment.prod.ts generated successfully');
