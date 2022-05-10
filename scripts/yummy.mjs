import axios from "axios";

import { timeStamp } from "../src/utils/Helpers.mjs";
import { Autostake } from "./base.mjs";

const BASE_URL = "https://api.yummy.capital/v2";
const LIMIT = 500;
const THROTTLE_MS = 100;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Yummy extends Autostake {
  constructor() {
    super();
  }

  getDelegations(client) {
    const fetch = async (address, pages = [], key = null) => {
      const searchParams = new URLSearchParams();
      searchParams.append("limit", LIMIT);

      if (key) {
        searchParams.append("key", key);
        await wait(THROTTLE_MS)
      }

      const response = await axios.get(`${BASE_URL}/validators/${address}/delegators?` + searchParams.toString());
      const { delegators, pagination } = response.data;

      pages.push(delegators.map((x) => x.account));
      timeStamp("...batch", pages.length);

      return pagination.nextKey ? fetch(address, pages, pagination.nextKey) : pages.flat();
    };

    return fetch(client.operator.address);
  }

  async runNetwork(client) {
    timeStamp("Running autostake");
    await this.checkBalance(client);

    timeStamp("Finding delegators...");
    const addresses = await this.getDelegations(client);

    timeStamp("Checking", addresses.length, "delegators for grants...");
    const grantedAddresses = await this.getGrantedAddresses(client, addresses);

    timeStamp("Found", grantedAddresses.length, "delegators with valid grants...");

    const grantMessages = await this.getAutostakeMessages(client, grantedAddresses, [client.operator.address]);
    await this.autostake(client, grantMessages);
    timeStamp(client.network.prettyName, "finished");
  }
}

const autostake = new Yummy();
const networkNames = process.argv.slice(2, process.argv.length)
autostake.run(networkNames);
