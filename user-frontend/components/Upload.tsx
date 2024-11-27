"use client";
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

export const Upload = () => {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  async function onSubmit() {
    const response = await axios.post(
      `${BACKEND_URL}/v1/user/task`,
      {
        options: images.map((image) => ({
          imageUrl: image,
        })),
        title,
        signature: txSignature,
      },
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    router.push(`/task/${response.data.id}`);
  }
  async function makePayment() {
    console.log("Initiating payment...");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: new PublicKey("CmccrPtk1k1x71pnX5N1vo2TujEBoaV59tHR2hPagWVU"),
        lamports: 100000000, // 0.1 SOL
      })
    );

    try {
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });

      console.log(`Transaction sent. Signature: ${signature}`);

      // Confirm transaction
      let isConfirmed = false;
      let retries = 0;
      const maxRetries = 10;

      while (!isConfirmed && retries < maxRetries) {
        try {
          const confirmation = await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature,
            },
            "finalized" // Ensure we wait for finalized commitment
          );

          if (confirmation.value.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
            );
          }

          isConfirmed = true;
          console.log(`Transaction confirmed: ${signature}`);
          setTxSignature(signature);
        } catch (error) {
          retries++;
          console.log(
            `Transaction pending. Retrying... (${retries}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        }
      }

      if (!isConfirmed) {
        throw new Error("Transaction confirmation timed out.");
      }
    } catch (error) {
      console.error("Payment failed:" + error);
      alert("Payment failed. Please try again.");
    }
  }

  return (
    <div className="flex justify-center">
      <div className="max-w-screen-lg w-full">
        <div className="text-2xl text-left pt-20 w-full pl-4">
          Create a task
        </div>

        <label className="pl-4 block mt-2 text-md font-medium text-gray-900">
          Task details
        </label>

        <input
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          type="text"
          id="first_name"
          className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          placeholder="What is your task?"
          required
        />

        <label className="pl-4 block mt-8 text-md font-medium text-gray-900">
          Add Images
        </label>
        <div className="flex justify-center pt-4 max-w-screen-lg">
          {images.map((image) => (
            <UploadImage
              image={image}
              onImageAdded={(imageUrl) => {
                setImages((i) => [...i, imageUrl]);
              }}
            />
          ))}
        </div>

        <div className="ml-4 pt-2 flex justify-center">
          <UploadImage
            onImageAdded={(imageUrl) => {
              setImages((i) => [...i, imageUrl]);
            }}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={txSignature ? onSubmit : makePayment}
            type="button"
            className="mt-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
          >
            {txSignature ? "Submit Task" : "Pay 0.1 SOL"}
          </button>
        </div>
      </div>
    </div>
  );
};
