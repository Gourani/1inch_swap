import Web3 from 'web3'; // Import the Web3 library for interacting with Ethereum
import fetch from 'node-fetch'; // Import the fetch library for making HTTP requests
import yesno from 'yesno'; // Import the yesno library for prompting user input

const walletAddress = '0x...xxx'; // Set your wallet address (replace '0x...xxx' with your actual wallet address)
const privateKey  = "0x000000000000000000000000000000"

const chain = 'mainnet';
const fromTokenAddress = '';
const toTokenAddress = '';
const amount ='';
const receiver_address ='receiver_address';
const fee = 1.5;

const rpcUrls = {
    blast: 'https://rpc.blast.io', //blast
    zora: 'https://rpc.zora.energy', //zora
    scroll: 'https://rpc.scroll.io', //scroll
    base: 'https://base.llamarpc.com', //Base
    zkSync: 'https://zksync-era.blockpi.network/v1/rpc/public', //zkSync Mainnet
    mainnet: 'https://eth.llamarpc.com', //Ethereum Mainnet
}

const slugToChainId = {
    blast: 81457,
    zora: 7777777,
    scroll: 534352,
    base: 8453,
    zkSync: 324,
    mainnet: 1
}
const web3RpcUrl  = rpcUrls[chain]
const chainId = slugToChainId[chain]
const swapParams = {
    fromTokenAddress: fromTokenAddress, // The address of the token you want to swap from (1INCH)
    toTokenAddress: toTokenAddress, // The address of the token you want to swap to (DAI)
    amount: amount, // The amount of the fromToken you want to swap (in wei)
    fromAddress: walletAddress, // Your wallet address from which the swap will be initiated
    slippage: 1, // The maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: false, // Whether to disable estimation of swap details (set to true to disable)
    allowPartialFill: false, // Whether to allow partial filling of the swap order (set to true to allow)
    fee:fee,// number min: 0; max: 3; default: 0
    referrer:receiver_address ,
    compatibility:true
};
const broadcastApiUrl = 'https://tx-gateway.1inch.io/v1.1/' + chainId + '/broadcast';
const apiBaseUrl = 'https://api.1inch.io/v5.0/' + chainId;
const web3 = new Web3(web3RpcUrl);

////////////////////////////////////////////////////////////////////////

// Construct full API request URL
function apiRequestUrl(methodName, queryParams) {
    return apiBaseUrl + methodName + '?' + (new URLSearchParams(queryParams)).toString();
}

function checkAllowance(tokenAddress, walletAddress) {
    return fetch(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress}))
        .then(res => res.json())
        .then(res => res.allowance);
}



// Post raw transaction to the API and return transaction hash
async function broadCastRawTransaction(rawTransaction) {
    return fetch(broadcastApiUrl, {
        method: 'post',
        body: JSON.stringify({ rawTransaction }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .then(res => {
            return res.transactionHash;
        });
}

// Sign and post a transaction, return its hash
async function signAndSendTransaction(transaction) {
    const { rawTransaction } = await web3.eth.accounts.signTransaction(transaction, privateKey);

    return await broadCastRawTransaction(rawTransaction);
}

// Prepare approval transaction, considering gas limit
async function buildTxForApproveTradeWithRouter(tokenAddress, amount) {
    const url = apiRequestUrl(
        '/approve/transaction',
        amount ? { tokenAddress, amount } : { tokenAddress }
    );

    const transaction = await fetch(url).then(res => res.json());

    const gasLimit = await web3.eth.estimateGas({
        ...transaction,
        from: walletAddress
    });

    return {
        ...transaction,
        gas: gasLimit
    };
}

async function buildTxForSwap(swapParams) {
    const url = apiRequestUrl('/swap', swapParams);

    // Fetch the swap transaction details from the API
    return fetch(url)
        .then(res => res.json())
        .then(res => res.tx);
}

////////////////////////////////////////////////////////////////////////
async function main() {
    const allowance =  await checkAllowance(swapParams.fromTokenAddress, walletAddress);
    console.log('Allowance: ', allowance);
    
    
    const transactionForSign = await buildTxForApproveTradeWithRouter(swapParams.fromTokenAddress);
    console.log('Transaction for approve: ', transactionForSign);
    
    const ok = await yesno({
        question: 'Do you want to send a transaction to approve trade with 1inch router?'
    });
    
    if (!ok) {
        return false;
    }
    
    const approveTxHash =  await signAndSendTransaction(transactionForSign);
    console.log('Approve tx hash: ', approveTxHash);
    
        // First, let's build the body of the transaction
    const swapTransaction = await buildTxForSwap(swapParams);
    console.log('Transaction for swap: ', swapTransaction);
    
    
        // Prompt the user to confirm the transaction before signing and sending it
    const ok2 =  await yesno({
        question: 'Do you want to send a transaction to exchange with 1inch router?'
    });
    
    // Confirm that all parameters are specified correctly before signing the transaction
    if (!ok2) {
        return false;
    }
    
    // Sign and send the swap transaction, and retrieve the transaction hash
    const swapTxHash = await signAndSendTransaction(swapTransaction);
    console.log('Transaction Signed and Sent: ', swapTxHash);
    
    
    /*
    With the transaction hash, you can monitor its execution using the blockchain explorer.
    
    */
}

main()