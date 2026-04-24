declare module 'elliptic' {
  export class eddsa {
    constructor(curve: string);

    keyFromSecret(secret: Uint8Array | Buffer | string): {
      getPublic(encoding?: string): string;
    };
  }
}
