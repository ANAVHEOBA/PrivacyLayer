// SDK integration — placeholder until @privacylayer/sdk is available

export const sdk = {
  // will be initialized with @privacylayer/sdk
  deposit: async (amount: string) => {
    console.log('deposit:', amount)
  },
  withdraw: async (proof: string) => {
    console.log('withdraw:', proof)
  },
}