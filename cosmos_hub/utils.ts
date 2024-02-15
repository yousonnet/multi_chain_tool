import { StargateClient, SigningStargateClient } from "@cosmjs/stargate";
import { Secp256k1HdWallet } from "@cosmjs/amino";
class StargateClientGroup {
  clients: StargateClient[];
  readonly menemonics!: string[];
  readonly rpc_endpoint!: string;
  readonly prefix_name!: string;
  constructor(menemonics: string[], rpc_endpoint: string, prefix_name: string) {
    this.menemonics = menemonics;
    this.rpc_endpoint = rpc_endpoint;
    this.prefix_name = prefix_name;
  }
  public async createClients() {
    this.clients = await Promise.all(
      this.menemonics.map(
        async (item) =>
          await SigningStargateClient.connectWithSigner(
            this.rpc_endpoint,
            await Secp256k1HdWallet.fromMnemonic(item, {
              prefix: this.prefix_name,
            })
          )
      )
    );
  }
}
