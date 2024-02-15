import { parseUnits } from "ethers";
import Decimal from "decimal.js";
let i = BigInt(new Decimal(123123n.toString()).mul(1.5).toFixed(0));
console.log(i);
