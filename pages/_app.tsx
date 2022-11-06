import "../styles/main.scss";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import secp256k1 from "@vulpemventures/secp256k1-zkp";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { Artifact, Contract } from "@ionio-lang/ionio";
import { networks, payments } from "liquidjs-lib";
import crowdfunding from "./crowdfunding.json";

const network = networks.regtest;

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    (async () => {
      const zkp = await secp256k1();
      const ECPair = ECPairFactory(ecc);
      const beneficiaryKeyPair = ECPair.fromPrivateKey(
        Buffer.from(
          "be945b04e35608be9db21b90f34023ffb87ae9c7a1ef125e091cd93f3f553878",
          "hex",
        ),
        { network },
      );
      const donorKeyPair = ECPair.fromPrivateKey(
        Buffer.from(
          "e36451789f29cdd2e4dcd44c2c9f8d7cd8c869b862d2a283c0860b9484b5adef",
          "hex",
        ),
        { network },
      );
      //console.log(beneficiaryKeyPair.privateKey?.toString('hex'), donorKeyPair.privateKey?.toString('hex'));

      const beneficiary = payments.p2wpkh({
        pubkey: beneficiaryKeyPair.publicKey,
        network,
      });

      const contract = new Contract(
        crowdfunding as Artifact,
        [
          5,
          10,
          200000, //200k sats
          "5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225",
          beneficiary.output!.subarray(2),
          donorKeyPair.publicKey.subarray(1),
        ],
        network,
        {
          ecc,
          zkp,
        },
      );
      console.log(contract.address);
    })();

    return () => {
      // this now gets called when the component unmounts
    };
  }, []);

  return <Component {...pageProps} />;
}
