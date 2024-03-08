/** @jsxImportSource frog/jsx */

import { Button, Frog, parseEther } from "frog";
import { handle } from "frog/next";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { PinataFDK, FrameActionPayload } from "pinata-fdk";
import abi from "./abi.json";

const CONTRACT = `${process.env.CONTRACT_ADDRESS}`;

const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x`) || "");

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

const fdk = new PinataFDK({
  pinata_jwt: process.env.PINATA_JWT || "",
  pinata_gateway: ''
})

async function getAddresForFID(fid: any) {
  try {
    let address;
    const data = await fetch(
      `https://api.pinata.cloud/v3/farcaster/users/${fid}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      },
    );
    const dataRes = await data.json();
    if (dataRes.data.verifications > 0) {
      address = dataRes.data.verifications[0];
    } else {
      address = "null";
    }
    console.log(address);
    return address;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function checkBalance(fid: any) {
  try {
    const address = await getAddresForFID(fid);
    const balance = await publicClient.readContract({
      address: CONTRACT as `0x`,
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
      address: CONTRACT as `0x`,
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

async function calculateAmount(fid: any) {
  const address = await getAddresForFID(fid);
  if (address === "null") {
    return "0.005";
  }

  const balance = await checkBalance(fid);
  if (typeof balance === "number" && balance > 0) {
    return "0.0025";
  }
  return "0.005";
}

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  // hubApiUrl: 'https://api.hub.wevm.dev',
});


app.frame("/", async (c) => {
  const balance = await remainingSupply();
  console.log(balance);
  const frameData: any = c.frameData
  await fdk.sendAnalytics("hat-store-frame", frameData, "load")
  return c.res({
    action: "/finish",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeC7uQZqkjmc1T6sufzbJWQpoeoYjQPxCXKUSoDrXfQFy",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/buy">Buy for 0.005 ETH</Button.Transaction>,
      <Button action="/ad">Watch ad for 1/2 off</Button>,
    ],
  });
});


app.frame("/finish", async (c) => {
  const frameData: any = c.frameData
  await fdk.sendAnalytics("hat-store-frame", frameData, "purchased-hat")
  return c.res({
    image:
      "https://dweb.mypinata.cloud/ipfs/QmZPysm8ZiR9PaNxNGQvqdT2gBjdYsjNskDkZ1vkVs3Tju",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Link href="https://warpcast.com/~/channel/pinata">
        Join the Pinata Channel
      </Button.Link>,
    ],
  });
});


app.frame("/ad", async (c) => {
  const balance = await checkBalance(c.frameData?.fid);
  const supply = await remainingSupply();
  const address = await getAddresForFID(c.frameData?.fid);

  const frameData: any = c.frameData
  await fdk.sendAnalytics("hat-store-frame", frameData, "watched-ad")

  if (address === "null") {
    return c.res({
      action: "/",
      image:
        "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
      imageAspectRatio: "1:1",
      intents: [<Button>No address connected, go back</Button>],
    });
  }
  if (
    typeof balance === "number" &&
    balance < 1 &&
    typeof supply === "number" &&
    supply > 0
  ) {
    const { request: mint } = await publicClient.simulateContract({
      account,
      address: CONTRACT as `0x`,
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

    console.log("nft minted");
  }
  return c.res({
    action: "/finish",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/buy">Buy for 0.0025 ETH</Button.Transaction>,
    ],
  });
});

app.transaction("/buy", async (c) => {
  const amount = await calculateAmount(c.frameData?.fid);
  console.log(amount);

  return c.contract({
    abi: abi.abi,
    chainId: "eip155:8453",
    functionName: "buyHat",
    args: [c.frameData?.fid],
    to: CONTRACT as `0x`,
    value: parseEther(amount),
  });
});

export const GET = handle(app);
export const POST = handle(app);
