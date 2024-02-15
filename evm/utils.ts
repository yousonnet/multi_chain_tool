import {
  Interface,
  JsonRpcProvider,
  Wallet,
  parseUnits,
  formatUnits,
  Contract,
} from "ethers";
import Web3 from "web3";
import { erc20_interface } from "./constants";
import { AbstractProvider } from "ethers/src.ts/providers";
class OwnWallets extends Wallet {
  readonly web3: Web3;
  readonly ethers_rpc: JsonRpcProvider;

  constructor(
    privateKey: string,
    rpc_endpoint: string,
    custom_rpc_provider: new (rpc_endpoint: string) => JsonRpcProvider
  ) {
    let rpc_provider = new custom_rpc_provider(rpc_endpoint);
    super(privateKey, rpc_provider);
    this.web3 = new Web3(rpc_endpoint);
    this.ethers_rpc = rpc_provider;
  }

  public async web3SignMessage(message: string) {
    let wallet = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);

    return wallet.sign("0x" + Buffer.from(message, "utf8").toString("hex"))
      .signature;
  }
  public async sendToMultiAddByAmount(addresses: string[], amount: number) {
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      let res = await this.sendTransaction({
        to: address,
        value: parseUnits(amount.toString(), "ether"),
      });
      console.log(res);
    }
  }
  public async sendToMultiAddByAmountWithToken(
    addresses: string[],
    amount: number,
    tokenAddress: string,
    decimal: number
  ) {
    // const contract_callable = new Contract(tokenAddress, erc20_interface);
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      let hex_data = erc20_interface.encodeFunctionData("trnasfer", [
        address,
        parseUnits(amount.toString(), decimal),
      ]);
      let res = await this.sendTransaction({
        to: tokenAddress,
        data: hex_data,
      });
      console.log(res);
    }
  }
}

class OwnWalletsGroup {
  readonly wallets_group: OwnWallets[];
  constructor(
    // privateKey: string,
    rpc_endpoint: string,
    multi_private_key: string[],
    custom_provider_class: new (rpc_endpoint: string) => JsonRpcProvider
  ) {
    this.wallets_group = multi_private_key.map(
      (item) => new OwnWallets(item, rpc_endpoint, custom_provider_class)
    );
  }
  public async receiveErc20Total(tokenAddress: string, target_address: string) {
    const contract_callable = new Contract(tokenAddress, erc20_interface);
    for (let wallet of this.wallets_group) {
      let balance: bigint = await contract_callable.balanceOf(wallet.address);
      let res = await contract_callable.transfer(target_address, balance);
      console.log(res);
    }
  }

  public async receiveETH(target_address: string) {
    let stimulated_gas = await this.wallets_group[0].estimateGas({
      to: target_address,
      value: parseUnits("1", "ether"),
    });
    let gas_price = await this.wallets_group[0].ethers_rpc.getFeeData();
    let gas_count_by_eth = gas_price.gasPrice! * stimulated_gas;
    for (let wallet of this.wallets_group) {
      let balance: bigint = await wallet.ethers_rpc.getBalance(wallet.address);

      let res = await wallet.sendTransaction({
        to: target_address,
        value: balance - gas_count_by_eth,
      });
      console.log(res);
    }
  }
}

export { OwnWallets, OwnWalletsGroup };
