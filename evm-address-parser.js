const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
const PRIVATE_KEY = 'b9d498534e30d093b313b74089e90d723162fcc88a2910466f49641916b06d6f';
const ETHER_API_KEY = '5JT3KKUFY84QHHQ7M5SRWCXI2HB6IIKVHZ';
const COVAL_API_KEY = 'cqt_rQqyYBDBrVKMqvFqPBBQRjpgRCTj';

const TEST_PUBLIC_KEY = '0xA928E574036EC0b5d8bC136fa45EA55dD279070c';

const ETHER_NORMAL_TRANSACTION_URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${TEST_PUBLIC_KEY}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${ETHER_API_KEY}`;
const ETHER_ERC20_TRANSACTION_URL = `https://api.etherscan.io/api?module=account&action=tokentx&address=${TEST_PUBLIC_KEY}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${ETHER_API_KEY}`;
const ZKSYNC_ERC20_TRANSACTION_URL = `https://api.zksync.io/api/v0.1/account/${TEST_PUBLIC_KEY}/history/0/50`;

const BALANCE_URLS = {
  Ethereum: `https://api.covalenthq.com/v1/${1}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  Blast: `https://api.covalenthq.com/v1/${81457}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  Zora: `https://api.covalenthq.com/v1/${7777777}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  Linea: `https://api.covalenthq.com/v1/${59144}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  zkSync: `https://api.covalenthq.com/v1/${324}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  Base: `https://api.covalenthq.com/v1/${8453}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
  Scroll: `https://api.covalenthq.com/v1/${534352}/address/${TEST_PUBLIC_KEY}/balances_v2/`,
};

const minABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

let chainLists = {
  ethereumMainnet: {
    url: 'https://eth-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf',
    web3: null,
    account: null,
    platform: 'ethereum',
    tokens: [],
  },
  blast: {
    url: 'https://rpc.blastblockchain.com',
    web3: null,
    account: null,
    platform: 'blast',
    tokens: [],
  },
  // zora: { url: 'https://rpc.zora.energy', web3: null, account: null, platform: 'sora', tokens: []},
  linea: {
    url: 'https://linea.blockpi.network/v1/rpc/public',
    web3: null,
    account: null,
    platform: 'linea',
    tokens: [],
  },
  zkSyncEra: {
    url: 'https://mainnet.era.zksync.io',
    web3: null,
    account: null,
    platform: 'zksync',
    tokens: [],
  },
  scroll: {
    url: 'https://scroll.blockpi.network/v1/rpc/public',
    web3: null,
    account: null,
    platform: 'scroll',
    tokens: [],
  },
  base: {
    url: 'https://base.blockpi.network/v1/rpc/public',
    web3: null,
    account: null,
    platform: 'base',
    tokens: [],
  },
};

let addresses = [];
let ids = [];
let tokensInfo = [];

const runEvmAddressParser = async (privateKey) => {
  let tokenIds = '';

  const getAllTokens = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(COINGECKO_API_URL);
        const result = await response.json();

        tokensInfo = result;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  };

  const getAllTokensInfo = (tokens) => {
    let fullResult = [];
    return new Promise(async (resolve, reject) => {
      try {
        const page = Math.ceil(tokens.length / 250);
        for (let index = 1; index <= page; index++) {
          try {
            console.log('...retreiving for page' + index + '...');
            const params = {
              vs_currency: 'usd',
              order: 'market_cap_desc',
              per_page: 250,
              page: index,
              sparkline: false,
            };
            const queryString = Object.keys(params)
              .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
              .join('&');
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/markets?${queryString}`
            );
            const result = await response.json();
            fullResult = [...fullResult, ...result];
          } catch (error) {
            console.log(error.stack);
            break;
          }
        }
        const tokenListWithPrices = fullResult.map((token) => ({
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          current_price: token.current_price,
        }));
        const sortedResult = tokenListWithPrices.sort((a, b) => b.current_price - a.current_price);

        resolve(sortedResult);
      } catch (error) {
        reject(error);
      }
    });
  };

  const getBalance = (web3Instance, address) => {
    return new Promise(async (resolve, reject) => {
      try {
        const balanceWei = await web3Instance.eth.getBalance(address);
        const balance = web3Instance.utils.fromWei(balanceWei, 'ether');

        resolve(balance);
      } catch (error) {
        reject(error);
      }
    });

    return balance;
  };

  const getTokenPrice = async (coinGeckoId) => {
    try {
      const params = {
        ids: coinGeckoId,
        vs_currencies: 'usd',
      };
      const queryString = Object.keys(params)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${queryString}`);
      const result = await response.json();
      let temp = [];
      for (let key in result) {
        temp.push({ id: key, usd: result[key].usd });
      }
      const totalResult = temp.sort((a, b) => b.usd - a.usd);
      console.log(totalResult);
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };

  // const tokenContracts = [
  //   // '0x2b1d36f5b61addaf7da7ebbd11b35fd8cfb0de31',
  //   '0xd03465338226ea0178337f4abb16fdd6df529f57',
  // ];
  async function getTokenBalances(walletAddress, web3, tokenContracts) {
    const balances = {};

    for (const contractAddress of tokenContracts) {
      try {
        const contract = new web3.eth.Contract(minABI, contractAddress);

        const balance = await contract.methods.balanceOf(walletAddress).call();
        const decimals = await contract.methods.decimals().call();

        // Adjust for token decimals
        const adjustedBalance = balance / Math.pow(10, decimals);

        // balances[contractAddress] = adjustedBalance;
        console.log('adsfasdfasdf:', adjustedBalance);
      } catch (error) {
        continue;
      }
    }
    return balances;
  }

  const getEtherscanTransactions = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(ETHER_NORMAL_TRANSACTION_URL);
        const data = await response.json();

        resolve(data);
      } catch (error) {
        console.log(error.stack);
        reject(error);
      }
    });
  };

  const getEtherscanTokenTransfers = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(ETHER_ERC20_TRANSACTION_URL);
        const data = await response.json();

        resolve(data);
      } catch (error) {
        console.log(error.stack);
        reject(error);
      }
    });
  };

  const getZkSyncscanTokenTransfers = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(
          `https://api.zksync.io/api/v0.1/account/0x82d336801744F96384F46f40d231eDaB8E3D33Bc/history/0/50`
        );
        const data = await response.json();

        resolve(data);
      } catch (error) {
        console.log(error.stack);
        reject(error);
      }
    });
  };

  const getAllBalances = async () => {
    try {
      let result = {};
      let resultPool = {};
      const urls = { ...BALANCE_URLS };
      for (let key in urls) {
        const url = urls[key];
        console.log('...Fetching balances of "' + key + '"...');
        const response = await fetch(`${url}?key=${COVAL_API_KEY}`);
        const subResult = await response.json();

        result[key] = {};
        resultPool[key] = {};
        subResult.data.items.map((item, index) => {
          addresses.push(item.contract_address);
          if (!item.pretty_quote) {
            resultPool[key][item.contract_display_name] =
              item.balance / Math.pow(10, item.contract_decimals);
          } else {
            result[key][item.contract_name] = item.pretty_quote;
          }
        });
      }
      console.log('Total balance of all assets is:', result);
      console.log('List of assets in the stacking/liquidity pool is:', resultPool);
    } catch (error) {
      console.log({
        message: error.message,
        stack: error.stack,
      });
    }
  };

  const getPricesList = async () => {
    console.log(`Retrieving ERC20 token prices...`);
    const allTokens = await getAllTokens();
    const result = await getAllTokensInfo(allTokens);
    console.log('result:', JSON.stringify(result));
    // const tokensBlast = allTokens.filter((token) => token.platforms.blast);
    // const tokensLinea = allTokens.filter((token) => token.platforms.linea);
    // const tokensZksync = allTokens.filter((token) => token.platforms.zksync);
    // const tokensScroll = allTokens.filter((token) => token.platforms.scroll);
    // const tokensBase = allTokens.filter((token) => token.platforms.base);
    // const tokensZora = allTokens.filter((token) => token.platforms.sora);
  };

  await getAllTokens();
  console.log('=========Task1,3 Began==========');
  await getAllBalances();
  console.log('=========Task1,3 Ended==========');
  console.log('=========Task2 Began==========');
  tokensInfo.map((item) => {
    const platforms = item.platforms;
    for (let key in platforms) {
      addresses.map((address) => {
        if (address === platforms[key]) {
          const index = ids.findIndex((a) => a === item.id);
          if (index < 0) ids.push(item.id);
        }
      });
    }
  });

  await getTokenPrice(ids);
  // await getPricesList();
  console.log('=========Task2 Ended==========');
};

runEvmAddressParser(TEST_PUBLIC_KEY);
