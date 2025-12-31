declare module 'jsonwebtoken' {
  export interface JwtPayload {
    userId: number;
    [key: string]: any;
  }

  export function sign(payload: any, secretOrPrivateKey: string, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string): JwtPayload;
  export function decode(token: string): JwtPayload | null;
}


