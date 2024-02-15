import { OwnWalletsGroup } from "./evm/utils";
import "dotenv/config";
import {
  formatEther,
  JsonRpcApiProvider,
  parseUnits,
  TransactionResponse,
  Wallet,
} from "ethers";
import Decimal from "decimal.js";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { JsonRpcProvider } from "ethers";

console.log("rpc endpoint:", process.env.EVM_RPC);

let memo = `IDM:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAElElEQVR4nO2YXUhbZxjHf0nMR6Mnil1GjHOO+kHWUvfViNAPxoasoxXpbgq2MKEQAsVuUHYxQeYouItRGLiBpDdbL3I5CXWwbtgLS0HasXWyDtFocZLM2pqSuFijNdlFPMd8nOS8BwvbRf83Oe/zvufN7/yf5z3vOccQDKQz/I9l/K8BtPQccLd6DrhbVeg9wddnUY1vbG4BYDGbAAgMb+wCa0fCgDJYk+cAAHPT91gd6gZA6g/x6sE2ZWwikVDGy6C5F6YHXgjQ12fB6W7A4XAUwdHph/5Q3niHw4HDcSAPdOn4QSqP7UMqGKsl4RqU4fLU6dc8R3a88tg+XWCydNdgnnsFikQiqnGbVIP1k+9J3f2pyG0taToop7dI2+5J3vexSTVEIhEkSUKSJLxer3Ist81mM1XeE7rgQNBBOb2RSASbVIPUH8L59a8AHH2nk+npac05XnTXA7AcVXe5lAwiDwu9fhOO2r1IkoTH48kDktv37y9QZS2dEDkLHo+HiRvjXBleFwLUdLDXb6K+8ZWi+MPoYt5v5vKpsvNI/SEyGPF4PEJgQoC9fhPvvndccSyZTHLzxs8AJRdKKa0OdZOcmKcqdJ1Kq/jaFBqZTCZZi8cAMJqyO0X1wJguQFkOuxkA/8d7GPnqye4Bx6//iMVsYnWom+qBMRbeLAbrOOsCwHR0kjv7P1Pi9ingi9GdgZ+eYq0NvH9+ztbNDiFIzUXS6zeR+vIDoLRrbZNL0PAD11ZHqIxaSc6ncMxmV35iMYH9wWMqDjVm2y0JOAJdkp+p+nOagLpu1PFLJ4ti1QNjClyhZDj52NGgshtpSGirW/8lpnviXDjneBj7g8ckFhO65xHei8tCLp6gS1Lfl53jYeKxGM7xsG44EAS0HaoFspCFoPFLJ5nqcJWEWz5zgVTfIMtnLtAYvKMbULMGTWlITswrTyMypAydnJgn2rkfd/05GgvOjcdipPoG89rVtbXbrTtCtxnhrU5eyZo6f7UolOobxDq8A2qwSQQDT4WmE67B5MR82b5y/bYrl5XjPXZxOBC8zXw7skWt30QM9QdPtZjBJinHmfVVAJKnj7CeFmbLziOS4h5f9josxgzx02/n9cm1mCeVNIO+1AoDynAA1RYzT55mX3hiXa8XOWe4OIqa/ul+jarQ70VxEVh9O8nGJsFA9vXypY9MrF27q4AaLo7ycmPhOoa/FhaoCv1GU3MrAJubm0pcREIpPuuvIJ1TO7lXnuuwGuDKyiPc20/T0WgEl6uOufCMEBwIOpguU9gybI+vAledm6W/o0qfq86Nq87NvT+mcLvrcbvrSafTtHccFgYUclAGUAPL1YfnrbzxVrvq+TIkQLrcFRdIVw1aDCY2Mlsl+7/7JkWPz6jqkMtVx+yM9stVoYQdBDEXe3xGmppb2fuCUzeMmnS/uGspGEjT4zOWBFx59FDXfLochGfj4u3JW8L/98wdhB0XAVVIuUZvT96ipdWj1GYwULx4dH/ALHSs0NFcyIXwbNmUtnccZnZmmpZWz/ZcxTi7/sJqN5eGvBrYYi48Uxayqbm1LOS/ghzMSlVowFsAAAAASUVORK5CYII=`;
let is_raw_memo = false;
let data = is_raw_memo ? memo : "0x" + Buffer.from(memo).toString("hex");
// console.log("memo is", data);
let is_self_transfer = "";
let gas_factor = 1.5;

const keys_array = process.env.EVM_KEYS!.split(",");
const wallets_group = new OwnWalletsGroup(
  process.env.EVM_RPC!,
  keys_array,
  JsonRpcProvider
);
const _authSigner = Wallet.createRandom();

async function main() {
  const flashbots_provider = await FlashbotsBundleProvider.create(
    new JsonRpcProvider(process.env.EVM_RPC!),
    _authSigner
    // "https://rpc.flashbots.net"
  );

  const feedata = await wallets_group.wallets_group[0].ethers_rpc.getFeeData();
  const gas_price_mul_gas_factor = BigInt(
    new Decimal(feedata.gasPrice!.toString()).mul(gas_factor).toFixed(0)
  );
  const stimulated_gas = await wallets_group.wallets_group[0].estimateGas({
    to:
      is_self_transfer === ""
        ? wallets_group.wallets_group[0].address
        : is_self_transfer,
    gasPrice: gas_price_mul_gas_factor,
    data,
  });
  console.log(
    "estimated gas price after multiply factor is",
    gas_price_mul_gas_factor
  );
  console.log("estimated gas is ", stimulated_gas);
  console.log(
    "approxiate eth cost per tx is:",
    Number(formatEther(gas_price_mul_gas_factor * stimulated_gas))
  );
  let block_number =
    (await wallets_group.wallets_group[0].ethers_rpc.getBlockNumber()) + 2;
  let nonce_array: number[] = [];
  for (let wallet of wallets_group.wallets_group) {
    let nonce = await wallet.getNonce();
    nonce_array.push(nonce);
  }
  let tx_pending: Promise<TransactionResponse | null>[] = [];
  for (let [index, wallet] of wallets_group.wallets_group.entries()) {
    let nonce_number = nonce_array[index];
    for (let i = 0; i < 3; i++) {
      let res = wallet
        .sendTransaction({
          to: is_self_transfer === "" ? wallet.address : is_self_transfer,
          gasPrice: gas_price_mul_gas_factor,
          gasLimit: stimulated_gas,
          data,
          nonce: nonce_number,
        })
        .catch((error) => {
          return null;
        });
      tx_pending.push(res);
      nonce_number++;
    }

    break;
  }
  let tx_result = await Promise.all(tx_pending);
  let successfulTransactions = tx_result.filter((result) => result !== null);

  console.log(successfulTransactions.length);
}
main();
