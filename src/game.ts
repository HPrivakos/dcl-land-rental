import { getUserAccount } from '@decentraland/EthereumController'
import { getProvider } from '@decentraland/web3-provider'
import * as eth from 'eth-connect'
import * as dclTx from 'decentraland-transactions'
import { signedFetch } from '@decentraland/SignedFetch'

function spawnCube(x: number, y: number, z: number) {
  const cube = new Entity()
  cube.addComponent(new Transform({ position: new Vector3(x, y, z) }))
  cube.addComponent(new BoxShape())
  engine.addEntity(cube)
  return cube
}

const cube = spawnCube(8, 1, 8)

cube.addComponent(
  new OnPointerDown(async () => {
    const fromAddress = await getUserAccount()
    const provider = await getProvider()
    const rentalConfig = dclTx.getContract(dclTx.ContractName.Rentals, 1)

    const domain = {
      name: rentalConfig.name,
      verifyingContract: rentalConfig.address,
      version: rentalConfig.version,
      chainId: '0x0000000000000000000000000000000000000000000000000000000000000001'
    }

    const types: Record<string, any[]> = {
      Listing: [
        { name: 'signer', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'indexes', type: 'uint256[3]' },
        { name: 'pricePerDay', type: 'uint256[]' },
        { name: 'maxDays', type: 'uint256[]' },
        { name: 'minDays', type: 'uint256[]' },
        { name: 'target', type: 'address' }
      ]
    }

    const periods = [
      {
        maxDays: 1,
        minDays: 1,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 7,
        minDays: 7,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 30,
        minDays: 30,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 60,
        minDays: 60,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 90,
        minDays: 90,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 180,
        minDays: 180,
        pricePerDay: '999999999999999999'
      },
      {
        maxDays: 365,
        minDays: 365,
        pricePerDay: '999999999999999999'
      }
    ]

    const values = {
      signer: fromAddress.toLowerCase(),
      contractAddress: '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d',
      tokenId: '115792089237316195423570985008687907810734688800523256106535758078942103207859',
      expiration: '1681966800',
      indexes: [0, 0, 1],
      pricePerDay: periods.map((period) => period.pricePerDay),
      maxDays: periods.map((period) => period.maxDays.toString()),
      minDays: periods.map((period) => period.minDays.toString()),
      target: '0x0000000000000000000000000000000000000000'
    }

    log(values)

    const typesWithDomain = {
      ...types,
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
      ]
    }

    const dataToSign = JSON.stringify({
      types: typesWithDomain,
      domain,
      primaryType: 'Listing',
      message: values
    })

    const signature = await new Promise<any>((resolve, reject) =>
      provider.send(
        {
          method: 'eth_signTypedData_v4',
          params: [fromAddress, dataToSign],
          jsonrpc: '2.0',
          id: 999999999999
        } as eth.RPCSendableMessage,
        async (err: any, result: any) => {
          if (err) {
            return reject(err)
          }
          log(result)
          return resolve(result)
        }
      )
    )
    log(signature.result)

    const res = await signedFetch('https://signatures-api.decentraland.org/v1/rentals-listings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        chainId: 1,
        contractAddress: '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d',
        tokenId: '115792089237316195423570985008687907810734688800523256106535758078942103207859',
        network: 'ETHEREUM',
        expiration: 1681966800000,
        rentalContractAddress: '0x3a1469499d0be105d4f77045ca403a5f6dc2f3f5',
        nonces: ['0', '0', '1'],
        periods,
        signature: signature.result,
        target: '0x0000000000000000000000000000000000000000'
      })
    })
    const json = await res.json()
    log(json)
  })
)
