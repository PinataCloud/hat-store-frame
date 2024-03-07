/** @jsxImportSource frog/jsx */

import { Button, Frog, parseEther } from 'frog'
import { handle } from 'frog/next'
import abi from './abi.json'

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

app.frame('/ad', (c) => {
  // action goes here
  console.log('nft minted')
  return c.res({
    action: '/finish',
    image: "https://dweb.mypinata.cloud/ipfs/QmaQC9shWhLWQiBuWNa2YGUFARekj5Qm7iCE59H4FzeSi4", 
    imageAspectRatio: '1:1',
    intents: [
      <Button.Transaction target="/buy-discount">Buy for 0.0025 ETH</Button.Transaction>,
    ]
  })
})


app.transaction('/buy-discount', (c) => {
  return c.contract({
    abi: abi.abi,
    chainId: 'eip155:8453',
    functionName: 'buyHat',
    args: [c.frameData?.fid || 0],
    to: '0xca2aae6b3cb869e30d0dccf222d507832b7c5b2d',
    value: parseEther('0.0025')
  })
})

 
app.transaction('/buy', (c) => {
  return c.contract({
    abi: abi.abi,
    chainId: 'eip155:8453',
    functionName: 'buyHat',
    args: [c.frameData?.fid || 0],
    to: '0xca2aae6b3cb869e30d0dccf222d507832b7c5b2d',
    value: parseEther('0.005')
  })
})

export const GET = handle(app)
export const POST = handle(app)
