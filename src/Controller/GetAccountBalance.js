import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const rpcEndpoint = import.meta.env.VITE_SOLANA_RPC;
const connection = new Connection(rpcEndpoint);

export const getAccountBalance = async (pubKeyString) => {
    try {
        // const wallet = new PublicKey(pubKeyString);
        // const SOLBalance = await connection.getBalance(wallet);

        // const accounts = await connection
        //     .getParsedTokenAccountsByOwner(
        //         wallet,
        //         {
        //             programId: TOKEN_PROGRAM_ID,
        //         }
        //     );
        // accounts.value.forEach(accountInfo => {
        //     // console.log(`pubkey: ${accountInfo.pubkey.toBase58()}`);
        //     // console.log(`mint: ${accountInfo.account.data["parsed"]["info"]["mint"]}`);
        //     // console.log(
        //         `owner: ${accountInfo.account.data["parsed"]["info"]["owner"]}`,
        //     );
        //     // console.log(
        //         `decimals: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["decimals"]}`,
        //     );
        //     // console.log(
        //         `amount: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["amount"]}`,
        //     );
        //     // console.log("====================");
        // });

        return { SOLBalance: SOLBalance / LAMPORTS_PER_SOL };
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return { SOLBalance: 0 }; // Default to 0 in case of error
    };
}
