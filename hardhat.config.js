require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const privateKeys = process.env.PRIVATE_KEYS || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    localhost: {},
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: privateKeys.split(",")
    },
    amoy: {
      apiKey: "jMCwxvF2LD7SBCXGpTy36_IyID8a0sN1", // Replace with your Alchemy API Key.
      network: Network.MATIC_AMOY, // Replace with your network.
    }
  }
};
