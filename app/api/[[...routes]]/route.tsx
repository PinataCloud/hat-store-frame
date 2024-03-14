/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput, parseEther } from "frog";
import { handle } from "frog/next";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { PinataFDK } from "pinata-fdk";
import abi from "./abi.json";

const fdk = new PinataFDK({
  pinata_jwt: process.env.PINATA_JWT || "",
  pinata_gateway: "",
});

const CONTRACT = process.env.CONTRACT_ADDRESS as `0x` || ""

const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x`) || "");

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.ALCHEMY_URL),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.ALCHEMY_URL),
});

async function checkBalance(address: any) {
  try {
    const balance = await publicClient.readContract({
      address: CONTRACT,
      abi: abi.abi,
      functionName: "balanceOf",
      args: [address, 0],
    });
    const readableBalance = Number(balance);
    return readableBalance;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function remainingSupply() {
  try {
    const balance = await publicClient.readContract({
      address: CONTRACT,
      abi: abi.abi,
      functionName: "totalSupply",
    });
    const readableBalance = Number(balance);
    return readableBalance;
  } catch (error) {
    console.log(error);
    return error;
  }
}

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
});

app.use(
  "/ad",
  fdk.analyticsMiddleware({ frameId: "hats-store", customId: "ad" }),
);
app.use(
  "/finish",
  fdk.analyticsMiddleware({ frameId: "hats-store", customId: "purchased" }),
);

app.frame("/", async (c) => {
  const balance = await remainingSupply();
  console.log(balance);
  if (typeof balance === "number" && balance === 0) {
    return c.res({
      image:
        "https://dweb.mypinata.cloud/ipfs/QmeeXny8775RQBZDhSppkRN15zn5nFjQUKeKAvYvdNx986",
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href="https://warpcast.com/~/channel/pinata">
          Join the Pinata Channel
        </Button.Link>,
      ],
      title: "Pinta Hat Store - SOLD OUT",
    });
  } else {
    return c.res({
      action: "/finish",
      image:
        "https://dweb.mypinata.cloud/ipfs/QmeC7uQZqkjmc1T6sufzbJWQpoeoYjQPxCXKUSoDrXfQFy",
      imageAspectRatio: "1:1",
      intents: [
        <Button.Transaction target="/buy/0.0005">
          Buy for 0.005 ETH
        </Button.Transaction>,
        <Button action="/ad">Watch ad for 1/2 off</Button>,
      ],
      title: "Pinta Hat Store",
    });
  }
});

app.frame("/finish", (c) => {
  return c.res({
    image:
      "https://dweb.mypinata.cloud/ipfs/QmZPysm8ZiR9PaNxNGQvqdT2gBjdYsjNskDkZ1vkVs3Tju",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Link href="https://warpcast.com/~/channel/pinata">
        Join the Pinata Channel
      </Button.Link>,
    ],
    title: "Pinta Hat Store",
  });
});

app.frame("/ad", async (c) => {
  return c.res({
    action: "/coupon",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <TextInput placeholder="Wallet Address (not ens)" />,
      <Button>Receive Coupon</Button>,
    ],
    title: "Pinta Hat Store",
  });
});

app.frame("/coupon", async (c) => {
  const supply = await remainingSupply();
  const address = c.inputText;
  const balance = await checkBalance(address);

  if (
    typeof balance === "number" &&
    balance < 1 &&
    typeof supply === "number" &&
    supply > 0
  ) {
    const { request: mint } = await publicClient.simulateContract({
      account,
      address: CONTRACT,
      abi: abi.abi,
      functionName: "mint",
      args: [address],
    });
    const mintTransaction = await walletClient.writeContract(mint);
    console.log(mintTransaction);

    const mintReceipt = await publicClient.waitForTransactionReceipt({
      hash: mintTransaction,
    });
    console.log("Mint Status:", mintReceipt.status);
  }

  return c.res({
    action: "/finish",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/buy/0.0025">
        Buy for 0.0025 ETH
      </Button.Transaction>,
    ],
    title: "Pinta Hat Store",
  });
});

app.transaction("/buy/:price", async (c) => {
  
  const price = c.req.param('price')

  return c.contract({
    abi: abi.abi,
    // @ts-ignore
    chainId: "eip155:84532",
    functionName: "buyHat",
    args: [c.frameData?.fid],
    to: CONTRACT,
    value: parseEther(`${price}`),
  });
});

export const GET = handle(app);
export const POST = handle(app);
