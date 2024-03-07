/** @jsxImportSource frog/jsx */

import { Button, Frog, parseEther } from 'frog'
import { handle } from 'frog/next'
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import abi from './abi.json'

const CONTRACT = `${process.env.CONTRACT_ADDRESS}`

const account = privateKeyToAccount(
  (process.env.PRIVATE_KEY as `0x`) || "",
);

export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

async function getAddresForFID(fid: any) {
  try {
    const data = await fetch(`https://api.pinata.cloud/v3/farcaster/users/${fid}`, {
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`
      }
    })
    const dataRes = await data.json()
    const address = dataRes.data.verifications[0]
    return address
  } catch (error) {
    console.log(error)
    return error
  }
}


const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  // Supply a Hub API URL to enable frame verification.
  // hubApiUrl: 'https://api.hub.wevm.dev',
})


app.frame('/', (c) => {
  return c.res({
    action: '/finish',
    image: "https://dweb.mypinata.cloud/ipfs/QmeC7uQZqkjmc1T6sufzbJWQpoeoYjQPxCXKUSoDrXfQFy",
    imageAspectRatio: '1:1',
    intents: [
      <Button.Transaction target="/buy">Buy for 0.005 ETH</Button.Transaction>,
      <Button action="/ad">Watch ad for 1/2 off</Button>
    ]
  })
})

app.frame('/finish', (c) => {
  return c.res({
    image: "https://dweb.mypinata.cloud/ipfs/QmZPysm8ZiR9PaNxNGQvqdT2gBjdYsjNskDkZ1vkVs3Tju",
    imageAspectRatio: '1:1',
    intents: [
      <Button.Link href='https://pinata.cloud'>Learn More</Button.Link>
    ]
  })
})

app.frame('/ad', async (c) => {

  const address = await getAddresForFID(c.frameData?.fid)
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

  console.log('nft minted')
  return c.res({
    action: '/finish',
    image: "https://dweb.mypinata.cloud/ipfs/QmaQC9shWhLWQiBuWNa2YGUFARekj5Qm7iCE59H4FzeSi4",
    imageAspectRatio: '1:1',
    intents: [
      <Button.Transaction target="/buy-discount">Buy for 0.00025 ETH</Button.Transaction>,
    ]
  })
})


app.transaction('/buy-discount', (c) => {
  return c.contract({
    abi: abi.abi,
    chainId: 'eip155:8453',
    functionName: 'buyHat',
    args: [c.frameData?.fid || 0],
    to: CONTRACT as `0x`,
    value: parseEther('0.0025')
  })
})


app.transaction('/buy', (c) => {
  return c.contract({
    abi: abi.abi,
    chainId: 'eip155:8453',
    functionName: 'buyHat',
    args: [c.frameData?.fid || 0],
    to: CONTRACT as `0x`,
    value: parseEther('0.005')
  })
})

export const GET = handle(app)
export const POST = handle(app)
