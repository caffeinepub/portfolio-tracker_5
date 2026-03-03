// Auto-generated stub - portfolio tracker has no backend canister interactions
import { Actor, HttpAgent, type Identity } from "@dfinity/agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type backendInterface = Record<string, (...args: any[]) => Promise<any>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreateActorOptions = Record<string, any> & {
  agentOptions?: {
    identity?: Identity;
    host?: string;
  };
};

/**
 * ExternalBlob stub - represents a blob stored externally via Caffeine storage.
 * Must be exported as a class (value), not just a type, for Rollup tree-shaking.
 */
export class ExternalBlob {
  hash: string;
  bucket: string;
  owner: string;
  projectId: string;
  onProgress?: (pct: number) => void;

  constructor(params: { hash: string; bucket: string; owner: string; projectId: string }) {
    this.hash = params.hash;
    this.bucket = params.bucket;
    this.owner = params.owner;
    this.projectId = params.projectId;
  }

  async getBytes(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  static fromURL(_url: string): ExternalBlob {
    return new ExternalBlob({ hash: "", bucket: "", owner: "", projectId: "" });
  }

  static fromFile(
    _data: Uint8Array,
    _options?: { onProgress?: (pct: number) => void },
  ): ExternalBlob {
    return new ExternalBlob({ hash: "", bucket: "", owner: "", projectId: "" });
  }
}

export const idlFactory = (_ctx: unknown) => {
  return { _services: {} };
};

export const canisterId =
  (typeof process !== "undefined" && process.env.CANISTER_ID_BACKEND) || "aaaaa-aa";

export async function createActor(
  canisterIdParam: string,
  options?: CreateActorOptions,
  extraArg1?: unknown,
  extraArg2?: unknown,
): Promise<backendInterface> {
  void extraArg1;
  void extraArg2;
  const agent = await HttpAgent.create({
    identity: options?.agentOptions?.identity,
    host: options?.agentOptions?.host ?? "https://ic0.app",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Actor.createActor(idlFactory as any, { agent, canisterId: canisterIdParam }) as backendInterface;
}
